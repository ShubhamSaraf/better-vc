export type NetworkSample = {
  timestamp: number; outboundKbps: number; inboundKbps: number; lossPct: number; rttMs: number; jitterMs: number;
  width: number; height: number; fps: number; framesEncoded: number; framesDropped: number; codec: string;
  limitation: string; candidate: string; connection: string; availableKbps: number;
};

export class NetworkMonitor {
  private previous = new Map<string, { bytes: number; time: number }>();
  constructor(private pc: RTCPeerConnection) {}
  async sample(): Promise<NetworkSample> {
    const reports = await this.pc.getStats();
    const out: NetworkSample = { timestamp: Date.now(), outboundKbps: 0, inboundKbps: 0, lossPct: 0, rttMs: 0, jitterMs: 0, width: 0, height: 0, fps: 0, framesEncoded: 0, framesDropped: 0, codec: '-', limitation: '-', candidate: '-', connection: 'connecting', availableKbps: 0 };
    reports.forEach((r) => {
      if ((r.type === 'outbound-rtp' || r.type === 'inbound-rtp') && r.kind === 'video') {
        const bytes = r.type === 'outbound-rtp' ? r.bytesSent : r.bytesReceived;
        const old = this.previous.get(r.id);
        const kbps = old ? Math.max(0, (bytes - old.bytes) * 8 / (r.timestamp - old.time)) : 0;
        this.previous.set(r.id, { bytes, time: r.timestamp });
        if (r.type === 'outbound-rtp') {
          out.outboundKbps = kbps; out.width = r.frameWidth || 0; out.height = r.frameHeight || 0; out.fps = r.framesPerSecond || 0;
          out.framesEncoded = r.framesEncoded || 0; out.framesDropped = r.framesDropped || 0; out.limitation = r.qualityLimitationReason || '-';
        } else { out.inboundKbps = kbps; out.jitterMs = (r.jitter || 0) * 1000; out.lossPct = r.packetsLost && r.packetsReceived ? r.packetsLost / (r.packetsLost + r.packetsReceived) * 100 : 0; }
        const codec = reports.get(r.codecId); if (codec) out.codec = String(codec.mimeType || '').replace('video/', '');
      }
      if (r.type === 'candidate-pair' && r.state === 'succeeded' && (r.nominated || r.selected)) {
        out.rttMs = (r.currentRoundTripTime || 0) * 1000; out.availableKbps = (r.availableOutgoingBitrate || 0) / 1000;
        const local = reports.get(r.localCandidateId); const remote = reports.get(r.remoteCandidateId);
        out.candidate = `${local?.candidateType || '?'} → ${remote?.candidateType || '?'}`;
        out.connection = local?.candidateType === 'relay' || remote?.candidateType === 'relay' ? 'TURN relay' : 'Direct P2P';
      }
    });
    return out;
  }
}
