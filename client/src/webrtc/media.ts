export class MediaManager {
  stream?: MediaStream;
  private facingMode: VideoFacingModeEnum = 'user';

  async start(videoDeviceId?: string, audioDeviceId?: string) {
    if (!navigator.mediaDevices?.getUserMedia) {
      const reason = !window.isSecureContext
        ? `Camera access requires HTTPS. Open https://${location.host} and accept the local certificate warning.`
        : 'This browser does not provide the MediaDevices camera API. Try a current Chrome, Edge, or Firefox release.';
      throw new Error(reason);
    }
    this.stop();
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined, width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 30, max: 30 }, aspectRatio: { ideal: 16 / 9 } },
      audio: { deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    return this.stream;
  }

  async switchCamera() {
    if (!this.stream) throw new Error('Start your camera first');
    const oldTrack = this.stream.getVideoTracks()[0];
    const current = oldTrack?.getSettings().facingMode || this.facingMode;
    const next: VideoFacingModeEnum = current === 'environment' ? 'user' : 'environment';
    const base = { width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 30, max: 30 }, aspectRatio: { ideal: 16 / 9 } } satisfies MediaTrackConstraints;
    let replacement: MediaStream;
    try { replacement = await navigator.mediaDevices.getUserMedia({ video: { ...base, facingMode: { exact: next } }, audio: false }); }
    catch { replacement = await navigator.mediaDevices.getUserMedia({ video: { ...base, facingMode: { ideal: next } }, audio: false }); }
    const newTrack = replacement.getVideoTracks()[0];
    if (!newTrack) throw new Error(`No ${next === 'environment' ? 'back' : 'front'} camera found`);
    newTrack.enabled = oldTrack?.enabled ?? true;
    if (oldTrack) { this.stream.removeTrack(oldTrack); oldTrack.stop(); }
    this.stream.addTrack(newTrack);
    this.facingMode = next;
    return newTrack;
  }

  async devices() {
    if (!navigator.mediaDevices?.enumerateDevices) return { cameras: [], microphones: [] };
    const all = await navigator.mediaDevices.enumerateDevices();
    return { cameras: all.filter(d => d.kind === 'videoinput'), microphones: all.filter(d => d.kind === 'audioinput') };
  }

  videoInfo() {
    const track = this.stream?.getVideoTracks()[0];
    return track ? { settings: track.getSettings(), capabilities: track.getCapabilities?.() } : undefined;
  }

  toggle(kind: 'audio' | 'video') {
    const track = kind === 'audio' ? this.stream?.getAudioTracks()[0] : this.stream?.getVideoTracks()[0];
    if (track) track.enabled = !track.enabled;
    return track?.enabled ?? false;
  }

  stop() { this.stream?.getTracks().forEach(t => t.stop()); this.stream = undefined; }
}
