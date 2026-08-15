import { QUALITY_LEVELS, type QualityProfile } from './qualityLevels';
import type { NetworkSample } from './networkMonitor';

export class QualityController extends EventTarget {
  level = QUALITY_LEVELS.length - 1;
  automatic = true;
  private samples: NetworkSample[] = [];
  private bad = 0;
  private good = 0;
  constructor(private sender: RTCRtpSender, private track: MediaStreamTrack) { super(); }
  setTrack(track: MediaStreamTrack) { this.track = track; }

  async apply(index: number) {
    this.level = Math.max(0, Math.min(QUALITY_LEVELS.length - 1, index));
    const q = QUALITY_LEVELS[this.level];
    try { await this.track.applyConstraints({ width: { ideal: q.width }, height: { ideal: q.height }, frameRate: { ideal: q.fps, max: q.fps }, aspectRatio: { ideal: 16 / 9 } }); } catch { /* camera may not expose every exact profile */ }
    const parameters = this.sender.getParameters();
    if (!parameters.encodings?.length) parameters.encodings = [{}];
    parameters.degradationPreference = 'maintain-resolution';
    parameters.encodings[0].maxBitrate = q.bitrate;
    parameters.encodings[0].maxFramerate = q.fps;
    parameters.encodings[0].priority = 'high';
    parameters.encodings[0].networkPriority = 'high';
    await this.sender.setParameters(parameters);
    this.dispatchEvent(new CustomEvent<QualityProfile>('change', { detail: q }));
  }

  async observe(sample: NetworkSample) {
    this.samples.push(sample); if (this.samples.length > 8) this.samples.shift();
    if (!this.automatic || this.samples.length < 3) return;
    const recent = this.samples.slice(-3);
    const loss = recent.reduce((n, s) => n + s.lossPct, 0) / recent.length;
    const rtt = recent.reduce((n, s) => n + s.rttMs, 0) / recent.length;
    const q = QUALITY_LEVELS[this.level];
    const available = recent.at(-1)?.availableKbps || 0;
    const bandwidthLimited = recent.some(s => s.limitation === 'bandwidth');
    const cpuLimited = recent.some(s => s.limitation === 'cpu');
    const poor = bandwidthLimited || loss > 4 || rtt > 450 || (available > 0 && available < q.bitrate / 1000 * 1.1);
    const healthy = !cpuLimited && loss < 1 && rtt < 180 && !bandwidthLimited && (available === 0 || available > q.bitrate / 1000 * 1.5);
    this.bad = poor ? this.bad + 1 : 0; this.good = healthy ? this.good + 1 : 0;
    if (cpuLimited && this.bad < 3) this.bad = 3; // lower FPS/load one step; don't mislabel it as bandwidth.
    if (this.bad >= 3 && this.level > 0) { this.bad = this.good = 0; await this.apply(this.level - 1); }
    else if (this.good >= 9 && this.level < QUALITY_LEVELS.length - 1) { this.bad = this.good = 0; await this.apply(this.level + 1); }
  }
}
