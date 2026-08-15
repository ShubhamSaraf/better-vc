import './style.css';
import { MediaManager } from './webrtc/media';
import { SignalingClient } from './webrtc/signaling';
import { PeerEngine } from './webrtc/peer';
import { NetworkMonitor, type NetworkSample } from './quality/networkMonitor';
import { QualityController } from './quality/controller';
import { QUALITY_LEVELS } from './quality/qualityLevels';
import type { ServerMessage } from '../../shared/types';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <section class="stage">
    <video id="remote" class="remote-video" autoplay playsinline></video>
    <div class="remote-placeholder"><strong>BETTER-VC</strong><span>Waiting for the other person</span></div>
    <div class="local-tile"><video id="local" autoplay muted playsinline></video><span>You</span></div>
    <div id="notice" class="call-notice muted">Start your camera first</div>
    <button id="drawerOpen" class="icon-button settings-button" aria-label="Open settings" aria-expanded="false">☰</button>
    <div class="quick-controls">
      <button id="mic" class="round-control" aria-label="Toggle microphone">Mic</button>
      <button id="cam" class="round-control" aria-label="Toggle camera">Camera</button>
      <button id="flip" class="round-control mobile-only" aria-label="Switch front or back camera">Flip</button>
      <button id="end" class="round-control end-control" aria-label="End call">End</button>
    </div>
  </section>
  <div id="drawerBackdrop" class="drawer-backdrop"></div>
  <aside id="drawer" class="drawer" aria-hidden="true">
    <header class="drawer-header"><div><h1>BETTER-VC</h1><span>clarity first</span></div><button id="drawerClose" class="icon-button" aria-label="Close settings">×</button></header>
    <div class="drawer-content">
      <section class="settings-group"><h2>Room</h2><input id="room" maxlength="16" placeholder="Room ID"><div class="button-grid"><button id="create">Create room</button><button id="join">Join room</button></div></section>
      <section class="settings-group"><h2>Devices</h2><select id="camera"><option value="">Default camera</option></select><select id="microphone"><option value="">Default microphone</option></select><button id="start" class="primary">Start camera</button></section>
      <section class="settings-group"><h2>Video quality</h2><label class="field">Codec<select id="codec"><option value="auto">Browser default</option><option>AV1</option><option>VP9</option><option>VP8</option><option>H264</option></select></label><label class="switch-row"><span>Automatic quality</span><input id="auto" type="checkbox" checked></label><div id="profiles" class="profiles"></div></section>
      <section class="settings-group"><h2>Diagnostics</h2><div id="stats" class="status">No active connection.</div></section>
    </div>
  </aside>`;

const el = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!;
const media = new MediaManager();
const signaling = new SignalingClient();
const peer = new PeerEngine(payload => signaling.relay(payload));
let monitor: NetworkMonitor | undefined;
let controller: QualityController | undefined;
let timer: number | undefined;
const notice = (text: string, error = false) => { el('notice').textContent = text; el('notice').className = `call-notice ${error ? 'error' : 'muted'}`; };
const setDrawer = (open: boolean) => {
  el('drawer').classList.toggle('open', open);
  el('drawerBackdrop').classList.toggle('open', open);
  el('drawer').setAttribute('aria-hidden', String(!open));
  el('drawerOpen').setAttribute('aria-expanded', String(open));
};

QUALITY_LEVELS.forEach((q, i) => { const b = document.createElement('button'); b.textContent = q.id; b.onclick = async () => { if (!controller) return notice('Start or join a call first', true); controller.automatic = false; el<HTMLInputElement>('auto').checked = false; await controller.apply(i); markProfile(); }; el('profiles').append(b); });
function markProfile() { [...el('profiles').children].forEach((b, i) => b.classList.toggle('active', i === controller?.level)); }

async function startMedia() {
  try {
    const stream = await media.start(el<HTMLSelectElement>('camera').value, el<HTMLSelectElement>('microphone').value);
    el<HTMLVideoElement>('local').srcObject = stream;
    await populateDevices();
    const settings = media.videoInfo()?.settings;
    notice(`Camera ready: ${settings?.width || '?'}×${settings?.height || '?'} @ ${settings?.frameRate || '?'} fps`);
  } catch (e) { notice(e instanceof Error ? e.message : 'Media capture failed', true); }
}
async function populateDevices() {
  const { cameras, microphones } = await media.devices();
  const fill = (id: string, list: MediaDeviceInfo[], fallback: string) => { const select = el<HTMLSelectElement>(id); const value = select.value; select.innerHTML = `<option value="">${fallback}</option>`; list.forEach((d, i) => select.add(new Option(d.label || `${fallback} ${i + 1}`, d.deviceId))); select.value = value; };
  fill('camera', cameras, 'Default camera'); fill('microphone', microphones, 'Default microphone');
}
function ensurePeer() {
  if (!media.stream) throw new Error('Start your camera first');
  if (!peer.pc) {
    peer.setCodec(el<HTMLSelectElement>('codec').value);
    peer.create(media.stream);
  }
}
async function connectSignal(room: string) { await signaling.connect(room); }

signaling.addEventListener('message', async (event) => {
  const msg = (event as CustomEvent<ServerMessage>).detail;
  try {
    if (msg.type === 'created') { el<HTMLInputElement>('room').value = msg.room; notice(`Room ${msg.room} created — share this ID`); ensurePeer(); }
    else if (msg.type === 'joined') { el<HTMLInputElement>('room').value = msg.room; ensurePeer(); notice(`Joined ${msg.room}; connecting…`); }
    else if (msg.type === 'peer-joined') { ensurePeer(); await peer.offer(); notice('Peer joined; calling…'); }
    else if (msg.type === 'signal') await peer.receive(msg.payload);
    else if (msg.type === 'peer-left') { peer.close(); stopStats(); el<HTMLVideoElement>('remote').srcObject = null; el('app').classList.remove('remote-active'); notice('Peer left'); }
    else if (msg.type === 'error') notice(msg.message, true);
  } catch (e) { notice(e instanceof Error ? e.message : 'Call error', true); }
});
peer.addEventListener('remote-stream', e => { el<HTMLVideoElement>('remote').srcObject = (e as CustomEvent<MediaStream>).detail; el('app').classList.add('remote-active'); setDrawer(false); });
peer.addEventListener('state', e => { const state = (e as CustomEvent<string>).detail; notice(`Connection: ${state}`); if (state === 'connected') startStats(); if (['failed', 'closed', 'disconnected'].includes(state)) stopStats(); });

function startStats() {
  stopStats(); const pc = peer.pc; const sender = peer.videoSender(); const track = media.stream?.getVideoTracks()[0]; if (!pc || !sender || !track) return;
  monitor = new NetworkMonitor(pc); controller = new QualityController(sender, track); controller.automatic = el<HTMLInputElement>('auto').checked; controller.addEventListener('change', markProfile); controller.apply(QUALITY_LEVELS.length - 1).catch(console.error); markProfile();
  timer = window.setInterval(async () => { if (!monitor || !controller) return; const s = await monitor.sample(); renderStats(s); await controller.observe(s); }, 1000);
}
function stopStats() { if (timer) clearInterval(timer); timer = undefined; monitor = undefined; controller = undefined; el('stats').textContent = 'No active connection.'; }
function renderStats(s: NetworkSample) {
  const capture = media.videoInfo()?.settings;
  el('stats').textContent = `${s.width || capture?.width || '?'}×${s.height || capture?.height || '?'} | ${s.fps || 0} fps | ${s.codec} | profile ${QUALITY_LEVELS[controller?.level || 0].id}\n` +
    `↑ ${s.outboundKbps.toFixed(0)} kbps  ↓ ${s.inboundKbps.toFixed(0)} kbps | loss ${s.lossPct.toFixed(2)}% | RTT ${s.rttMs.toFixed(0)} ms | jitter ${s.jitterMs.toFixed(1)} ms\n` +
    `${s.connection} (${s.candidate}) | limitation: ${s.limitation} | available: ${s.availableKbps.toFixed(0)} kbps | frames encoded: ${s.framesEncoded}`;
}

el('start').onclick = startMedia;
el('drawerOpen').onclick = () => setDrawer(true);
el('drawerClose').onclick = () => setDrawer(false);
el('drawerBackdrop').onclick = () => setDrawer(false);
el('create').onclick = async () => { try { ensurePeer(); const requested = el<HTMLInputElement>('room').value.trim().toUpperCase(); const room = requested || crypto.randomUUID().slice(0, 6).toUpperCase(); await connectSignal(room); signaling.create(room); } catch (e) { notice(e instanceof Error ? e.message : 'Could not create room', true); } };
el('join').onclick = async () => { try { const room = el<HTMLInputElement>('room').value.trim().toUpperCase(); if (!room) throw new Error('Enter a room ID'); ensurePeer(); await connectSignal(room); signaling.join(room); } catch (e) { notice(e instanceof Error ? e.message : 'Could not join room', true); } };
el('mic').onclick = () => { const on = media.toggle('audio'); el('mic').textContent = on ? 'Mic' : 'Mic off'; el('mic').classList.toggle('control-off', !on); };
el('cam').onclick = () => { const on = media.toggle('video'); el('cam').textContent = on ? 'Camera' : 'Camera off'; el('cam').classList.toggle('control-off', !on); };
el('flip').onclick = async () => {
  const button = el<HTMLButtonElement>('flip');
  button.disabled = true; button.textContent = 'Switching…';
  try {
    const track = await media.switchCamera();
    await peer.videoSender()?.replaceTrack(track);
    if (controller) { controller.setTrack(track); await controller.apply(controller.level); }
    if (media.stream) el<HTMLVideoElement>('local').srcObject = media.stream;
    await populateDevices();
    notice(`Using ${track.getSettings().facingMode === 'environment' ? 'back' : 'front'} camera`);
  } catch (e) { notice(e instanceof Error ? e.message : 'Could not switch camera', true); }
  finally { button.disabled = false; button.textContent = 'Flip'; }
};
el('end').onclick = () => { if (signaling.room) signaling.relay({ type: 'hangup' }); peer.close(); stopStats(); el<HTMLVideoElement>('remote').srcObject = null; el('app').classList.remove('remote-active'); notice('Call ended'); };
el<HTMLInputElement>('auto').onchange = e => { if (controller) controller.automatic = (e.target as HTMLInputElement).checked; };
el<HTMLSelectElement>('codec').onchange = e => peer.setCodec((e.target as HTMLSelectElement).value);
populateDevices().catch(() => {});
