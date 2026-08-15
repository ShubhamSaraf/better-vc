import type { SignalPayload } from '../../../shared/types';

export class PeerEngine extends EventTarget {
  pc?: RTCPeerConnection;
  private pendingIce: RTCIceCandidateInit[] = [];
  private preferredCodec = 'auto';
  constructor(private relay: (message: SignalPayload) => void) { super(); }

  private iceServers(): RTCIceServer[] {
    const servers: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
    const urls = String(import.meta.env.VITE_TURN_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (urls.length) servers.push({ urls, username: import.meta.env.VITE_TURN_USERNAME, credential: import.meta.env.VITE_TURN_CREDENTIAL });
    return servers;
  }

  create(stream: MediaStream) {
    this.close();
    const pc = this.pc = new RTCPeerConnection({ iceServers: this.iceServers(), bundlePolicy: 'max-bundle' });
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    this.applyCodecPreference();
    pc.onicecandidate = e => e.candidate && this.relay({ type: 'ice', candidate: e.candidate.toJSON() });
    pc.ontrack = e => this.dispatchEvent(new CustomEvent('remote-stream', { detail: e.streams[0] }));
    pc.onconnectionstatechange = () => this.dispatchEvent(new CustomEvent('state', { detail: pc.connectionState }));
    return pc;
  }

  setCodec(codec: string) { this.preferredCodec = codec; this.applyCodecPreference(); }
  private applyCodecPreference() {
    if (!this.pc || this.preferredCodec === 'auto') return;
    const codecs = RTCRtpReceiver.getCapabilities('video')?.codecs || [];
    const wanted = codecs.filter(c => c.mimeType.toLowerCase() === `video/${this.preferredCodec.toLowerCase()}`);
    const rest = codecs.filter(c => !wanted.includes(c));
    this.pc.getTransceivers().find(t => t.receiver.track.kind === 'video')?.setCodecPreferences([...wanted, ...rest]);
  }

  async offer() { if (!this.pc) throw new Error('Camera is not ready'); const sdp = await this.pc.createOffer(); await this.pc.setLocalDescription(sdp); this.relay({ type: 'offer', sdp }); }
  async receive(message: SignalPayload) {
    if (!this.pc && message.type !== 'hangup') throw new Error('Camera is not ready');
    const pc = this.pc!;
    if (message.type === 'offer') { await pc.setRemoteDescription(message.sdp); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); this.relay({ type: 'answer', sdp: answer }); await this.flushIce(); }
    else if (message.type === 'answer') { await pc.setRemoteDescription(message.sdp); await this.flushIce(); }
    else if (message.type === 'ice') { if (pc.remoteDescription) await pc.addIceCandidate(message.candidate); else this.pendingIce.push(message.candidate); }
    else if (message.type === 'hangup') this.close();
  }
  private async flushIce() { for (const candidate of this.pendingIce.splice(0)) await this.pc?.addIceCandidate(candidate); }
  videoSender() { return this.pc?.getSenders().find(s => s.track?.kind === 'video'); }
  close() { this.pc?.close(); this.pc = undefined; this.pendingIce = []; }
}
