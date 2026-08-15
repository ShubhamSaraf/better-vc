# Local validation checklist

1. Start `npm run dev`; verify ports 5173 and 8787.
2. Open `https://localhost:5173` in two tabs, accept the local certificate, start media in each, and create/join a room.
3. Confirm remote video/audio and `Direct P2P` diagnostics.
4. Click each Q8→Q0 profile; observe actual resolution/FPS (browser/camera may approximate constraints).
5. Re-enable Auto quality and use browser DevTools WebRTC network throttling or OS traffic shaping.
6. Confirm downgrades occur one step at a time after about 3 seconds and recovery after about 9 seconds.
7. Configure TURN, force relay with browser WebRTC internals/policy, and verify `TURN relay`.
8. Repeat codec tests on every intended device; record CPU, drops, latency, and perceived face clarity before choosing a non-default codec.

Do not infer public-network reliability from two localhost tabs. Camera quality, hardware encoding, codecs, NAT behavior, and available bandwidth are device/network dependent.
