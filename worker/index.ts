import { DurableObject } from 'cloudflare:workers';
import type { ClientMessage, ServerMessage } from '../shared/types';

const send = (socket: WebSocket, message: ServerMessage) => {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
};

export class Room extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket upgrade required', { status: 426 });
    if (this.ctx.getWebSockets().length >= 2) return new Response('Room is full', { status: 409 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ joined: false });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    try {
      const message = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)) as ClientMessage;
      const peers = this.ctx.getWebSockets();
      if (message.type === 'create') {
        if (peers.length !== 1) throw new Error('Room already exists');
        socket.serializeAttachment({ joined: true });
        send(socket, { type: 'created', room: message.room || '' });
      } else if (message.type === 'join') {
        if (peers.length !== 2) throw new Error('Room not found');
        socket.serializeAttachment({ joined: true });
        send(socket, { type: 'joined', room: message.room, initiator: false });
        for (const peer of peers) if (peer !== socket) send(peer, { type: 'peer-joined' });
      } else if (message.type === 'signal') {
        const attachment = socket.deserializeAttachment() as { joined?: boolean } | null;
        if (!attachment?.joined) throw new Error('Join the room before signaling');
        for (const peer of peers) if (peer !== socket) send(peer, { type: 'signal', payload: message.payload });
      }
    } catch (error) { send(socket, { type: 'error', message: error instanceof Error ? error.message : 'Invalid message' }); }
  }

  async webSocketClose(socket: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    socket.close(code, reason);
    for (const peer of this.ctx.getWebSockets()) if (peer !== socket) send(peer, { type: 'peer-left' });
    console.log(JSON.stringify({ event: 'room_socket_closed', code, wasClean }));
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/signal') {
      const room = url.searchParams.get('room')?.trim().toUpperCase();
      if (!room || !/^[A-Z0-9-]{1,16}$/.test(room)) return new Response('Invalid room', { status: 400 });
      return env.ROOMS.getByName(room).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
