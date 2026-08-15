import { WebSocket, WebSocketServer } from 'ws';
import type { ClientMessage, ServerMessage } from '../shared/types.ts';
import { Rooms } from './rooms.ts';

const port = Number(process.env.SIGNAL_PORT || 8787);
const wss = new WebSocketServer({ port });
const rooms = new Rooms();
const send = (ws: WebSocket, msg: ServerMessage) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));

wss.on('connection', (socket, request) => {
  const routedRoom = new URL(request.url || '/', 'http://localhost').searchParams.get('room')?.toUpperCase();
  socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as ClientMessage;
      if (msg.type === 'create') {
        if (routedRoom && msg.room !== routedRoom) throw new Error('Room route mismatch');
        const room = rooms.create(socket, msg.room);
        send(socket, { type: 'created', room });
      } else if (msg.type === 'join') {
        const id = msg.room.trim().toUpperCase();
        if (routedRoom && id !== routedRoom) throw new Error('Room route mismatch');
        const peers = rooms.join(id, socket);
        send(socket, { type: 'joined', room: id, initiator: false });
        for (const peer of peers) if (peer !== socket) send(peer, { type: 'peer-joined' });
      } else if (msg.type === 'signal') {
        const peers = rooms.get(msg.room);
        if (!peers?.has(socket)) throw new Error('Not a member of this room');
        for (const peer of peers) if (peer !== socket) send(peer, { type: 'signal', payload: msg.payload });
      }
    } catch (error) { send(socket, { type: 'error', message: error instanceof Error ? error.message : 'Invalid message' }); }
  });
  socket.on('close', () => {
    for (const id of rooms.leave(socket)) for (const peer of rooms.get(id) || []) send(peer, { type: 'peer-left' });
  });
});

console.log(`Better-VC signaling listening on ws://localhost:${port}`);
