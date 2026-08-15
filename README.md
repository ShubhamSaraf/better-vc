# Better-VC

A minimal 1-to-1 WebRTC calling app that preserves spatial detail by reducing frame rate several times before dropping below 720p.

## Run locally

Requirements: Node.js 20+ and two modern Chromium/Firefox browsers.

```bash
npm install
npm run dev
```

Open `https://localhost:5173` in two tabs and accept the development certificate warning. In both tabs, click **Start camera**. Create a room in the first tab, copy its ID to the second, and join.

For two physical devices, open `https://<computer-lan-ip>:5173` and accept the development certificate warning on each device. Vite proxies secure signaling automatically, so no signal URL is needed during local development. Ensure ports 5173 and 8787 are allowed by the host firewall.

## Highest-quality behavior

- Requests native 4K30 capture where available and falls back to the camera's highest supported mode.
- Uses `maintain-resolution`, high sender/network priority, explicit bitrates and frame caps.
- Automatic ladder: 4K30 at 25 Mbps → 15 Mbps → 1080p30 at 5 Mbps → 3.2 Mbps → 720p30 → 24 → 20 → 15 → 10 fps → 480p.
- Three sustained poor samples trigger one downgrade; nine healthy samples trigger one upgrade.
- Audio echo cancellation/noise suppression remains enabled and video bitrate is capped per profile.
- Codec ordering is selectable for real device testing; browser default remains safest.

## TURN configuration

Copy `.env.example` to `.env` and configure your own TURN service:

```env
VITE_TURN_URLS=turn:turn.example.com:3478?transport=udp,turns:turn.example.com:5349
VITE_TURN_USERNAME=user
VITE_TURN_CREDENTIAL=secret
```

STUN works without configuration. TURN credentials are intentionally not bundled; localhost/LAN tests usually connect directly. The diagnostics panel identifies direct versus relayed connections.

## Commands

- `npm run dev` — signaling server and Vite client
- `npm run build` — strict TypeScript check and production build
- `npm test` — quality-ladder tests
- `npm run dev:signal` / `npm run dev:client` — start components separately
- `npm run deploy:dry` — validate the Cloudflare Worker bundle without publishing
- `npm run deploy` — deploy UI and signaling to `better-vc.shubhamsaraf.dev`

## Public deployment

Production uses one Cloudflare Worker for the static client and a hibernating Durable Object per room for WebSocket signaling. Audio and video remain peer-to-peer. Authenticate once with `npx wrangler login`, then run `npm run deploy`. The custom-domain configuration provisions DNS and TLS for `better-vc.shubhamsaraf.dev`; the hostname must not already have a conflicting CNAME record.

## Scope boundary

The localhost V1 includes phases 1–12 and audio protection fundamentals: capture, signaling, WebRTC, configurable STUN/TURN, diagnostics, manual profiles, smoothed automatic adaptation, codec preference, and CPU-aware downshifting. Bandwidth matrices, device-specific codec conclusions, deployed TURN, face-aware preprocessing, long-duration reliability, and real-network validation require actual target devices/infrastructure; they are experiments rather than claims made by this local build.
