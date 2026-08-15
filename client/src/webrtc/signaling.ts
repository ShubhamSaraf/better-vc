import type { ClientMessage, ServerMessage } from '../../../shared/types';

export class SignalingClient extends EventTarget {
  private socket?: WebSocket;
  room = '';
  connect(room: string) {
    if (this.socket?.readyState === WebSocket.OPEN && this.room === room) return Promise.resolve();
    this.socket?.close();
    this.room = room;
    return new Promise<void>((resolve, reject) => {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const base = import.meta.env.VITE_SIGNAL_URL || `${protocol}//${location.host}/signal`;
      const separator = base.includes('?') ? '&' : '?';
      this.socket = new WebSocket(`${base}${separator}room=${encodeURIComponent(room)}`);
      this.socket.onopen = () => resolve();
      this.socket.onerror = () => reject(new Error('Cannot reach signaling server'));
      this.socket.onmessage = e => {
        const msg = JSON.parse(e.data) as ServerMessage;
        if (msg.type === 'created' || msg.type === 'joined') this.room = msg.room;
        this.dispatchEvent(new CustomEvent<ServerMessage>('message', { detail: msg }));
      };
      this.socket.onclose = () => this.dispatchEvent(new Event('close'));
    });
  }
  send(message: ClientMessage) { if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('Signaling is disconnected'); this.socket.send(JSON.stringify(message)); }
  create(room: string) { this.send({ type: 'create', room }); }
  join(room: string) { this.send({ type: 'join', room }); }
  relay(payload: import('../../../shared/types').SignalPayload) { this.send({ type: 'signal', room: this.room, payload }); }
  close() { this.socket?.close(); }
}
