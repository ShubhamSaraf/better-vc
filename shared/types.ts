export type SessionDescription = { type: 'answer' | 'offer' | 'pranswer' | 'rollback'; sdp?: string };
export type IceCandidate = { candidate?: string; sdpMid?: string | null; sdpMLineIndex?: number | null; usernameFragment?: string | null };

export type SignalPayload =
  | { type: 'offer'; sdp: SessionDescription }
  | { type: 'answer'; sdp: SessionDescription }
  | { type: 'ice'; candidate: IceCandidate }
  | { type: 'hangup' };

export type ClientMessage =
  | { type: 'create'; room?: string }
  | { type: 'join'; room: string }
  | { type: 'signal'; room: string; payload: SignalPayload };

export type ServerMessage =
  | { type: 'created'; room: string }
  | { type: 'joined'; room: string; initiator: boolean }
  | { type: 'peer-joined' }
  | { type: 'peer-left' }
  | { type: 'signal'; payload: SignalPayload }
  | { type: 'error'; message: string };
