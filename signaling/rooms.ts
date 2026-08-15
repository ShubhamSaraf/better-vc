import type { WebSocket } from 'ws';

export class Rooms {
  private rooms = new Map<string, Set<WebSocket>>();

  create(socket: WebSocket, requested?: string): string {
    let id = requested?.trim().toUpperCase();
    if (!id || this.rooms.has(id)) do id = crypto.randomUUID().slice(0, 6).toUpperCase(); while (this.rooms.has(id));
    this.rooms.set(id, new Set([socket]));
    return id;
  }

  join(id: string, socket: WebSocket): Set<WebSocket> {
    const room = this.rooms.get(id);
    if (!room) throw new Error('Room not found');
    if (room.size >= 2) throw new Error('Room is full');
    room.add(socket);
    return room;
  }

  get(id: string) { return this.rooms.get(id); }

  leave(socket: WebSocket): string[] {
    const affected: string[] = [];
    for (const [id, peers] of this.rooms) {
      if (!peers.delete(socket)) continue;
      affected.push(id);
      if (!peers.size) this.rooms.delete(id);
    }
    return affected;
  }
}
