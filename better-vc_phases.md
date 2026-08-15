# Better-VC Development Phases

## Phase 1 - Project Setup

Create the project structure.

Tasks:

- Initialize TypeScript project.
- Create client and signaling folders.
- Add development server.
- Add WebSocket support.
- Create minimal HTML page.
- Add local and remote video elements.
- Add basic logging.

Target:

The project runs locally and both client and signaling server can start independently.

---

## Phase 2 - Local Camera and Microphone

Implement media capture.

Tasks:

- Request camera permission.
- Request microphone permission.
- Display local camera preview.
- Read camera capabilities.
- Read actual capture settings.
- Prefer highest practical native resolution.
- Add camera/mic enable-disable controls.

Target:

The browser can capture stable local 1080p or highest supported video.

---

## Phase 3 - Basic WebRTC 1-to-1 Call

Implement direct WebRTC calling.

Tasks:

- Create RTCPeerConnection.
- Add local media tracks.
- Generate SDP offer.
- Generate SDP answer.
- Exchange ICE candidates.
- Display remote stream.
- Handle hang-up.
- Handle peer disconnect.

Target:

Two devices on a test network can make a stable 1-to-1 video call.

---

## Phase 4 - Signaling Rooms

Add simple room-based signaling.

Tasks:

- Create room ID.
- Join room ID.
- Limit room to two users.
- Relay offer.
- Relay answer.
- Relay ICE candidates.
- Clean up disconnected rooms.

Target:

A user can send the room ID to another person and start a call.

---

## Phase 5 - STUN and TURN Reliability

Improve connection reliability.

Tasks:

- Configure STUN.
- Deploy or configure TURN.
- Detect selected ICE candidate pair.
- Display whether connection is:
  - direct
  - TURN relayed
- Test from different Wi-Fi/mobile networks.

Target:

Calls work reliably even when direct P2P cannot be established.

---

## Phase 6 - WebRTC Diagnostics

Add detailed connection statistics.

Collect every ~1 second:

- resolution
- FPS
- outgoing bitrate
- incoming bitrate
- packet loss
- RTT
- jitter
- frames encoded
- frames dropped
- codec
- qualityLimitationReason
- candidate type
- TURN/P2P status

Display the values in a basic debug panel.

Target:

You can clearly see what WebRTC is doing during a call.

---

## Phase 7 - Manual Quality Profiles

Create explicit video quality levels.

Profiles:

```text
Q8 - 1080p @ 30 fps
Q7 - 720p @ 30 fps
Q6 - 720p @ 24 fps
Q5 - 720p @ 20 fps
Q4 - 720p @ 15 fps
Q3 - 720p @ 10 fps
Q2 - 480p @ 15 fps
Q1 - 480p @ 10 fps
Q0 - 360p @ 10 fps
```

Tasks:

- Change track constraints.
- Change RTCRtpSender maxFramerate.
- Change maxBitrate.
- Verify actual output resolution/FPS.
- Add temporary quality-level buttons.

Target:

You can manually force any quality profile during a live call.

---

## Phase 8 - Bandwidth Test Environment

Create repeatable bandwidth tests.

Test conditions:

- 5 Mbps
- 3 Mbps
- 2 Mbps
- 1.5 Mbps
- 1 Mbps
- 750 kbps
- 500 kbps
- 300 kbps
- 200 kbps

For each level record:

- actual bitrate
- resolution
- FPS
- packet loss
- RTT
- visual clarity
- CPU load
- codec
- dropped frames

Target:

Determine which profile gives the best perceived quality at each bandwidth level.

---

## Phase 9 - Automatic Quality Controller V1

Implement simple automatic adaptation.

Initial behavior:

```text
1080p30
   |
720p30
   |
720p24
   |
720p20
   |
720p15
   |
720p10
   |
480p15
   |
480p10
```

Rules:

- Downgrade after sustained poor conditions.
- Upgrade after longer sustained good conditions.
- Change only one level at a time.
- Preserve audio bandwidth.
- Avoid rapid switching.

Suggested timing:

- downgrade delay: 2-3 seconds
- upgrade delay: 8-10 seconds

Target:

Quality adapts automatically without excessive oscillation.

---

## Phase 10 - Smoothed Network Analysis

Make the controller less reactive to individual samples.

Tasks:

- Add rolling averages.
- Track bitrate trend.
- Track packet-loss trend.
- Track RTT trend.
- Detect sudden bandwidth collapse.
- Detect recovery.
- Add hysteresis.

Example:

```text
Samples:
2.4
2.3
2.1
1.8
1.4
1.1 Mbps

Result:
network is consistently degrading
-> downgrade before severe packet loss occurs
```

Target:

Better-VC reacts smoothly and predictably.

---

## Phase 11 - Codec Testing

Compare codecs on the actual devices you use.

Test:

- H.264
- VP8
- VP9
- AV1 when practical

Run the same tests at:

- 1080p30
- 720p30
- 720p20
- 720p15

At fixed bandwidth levels.

Record:

- visual quality
- CPU
- GPU usage when available
- dropped frames
- encode time
- latency
- stability

Target:

Choose the codec configuration that gives the best real-world result on your devices.

---

## Phase 12 - CPU-Aware Quality Control

Use encoder limitation information.

If the limitation is network bandwidth:

```text
reduce bitrate
then FPS
then resolution
```

If the limitation is CPU:

```text
reduce processing
reduce encoder complexity
possibly lower FPS
```

Do not automatically reduce resolution for every problem.

Target:

The controller distinguishes network problems from local-device problems.

---

## Phase 13 - Face DeÛu×{h‘éì¶»§q«^t¢–b‚æWuG&6²’F‡&÷ræWrW'&÷"†æòG¶æW‡BÓÓÒvVçf—&öæÖVçBròv&6²r¢vg&öçBwÒ6ÖW&f÷VæF“°¢æWuG&6²æVæ&ÆVBÒöÆEG&6³òæVæ&ÆVBóòG'VS°¢–b†öÆEG&6²’²F†—2ç7G&VÒç&VÖ÷fUG&6²†öÆEG&6²“²öÆEG&6²ç7F÷‚“²Ğ¢F†—2ç7G&VÒæFEG&6²†æWuG&6²“°¢F†—2æf6–ætÖöFRÒæW‡C°¢&WGW&âæWuG&6³°¢Ğ ¢7–æ2FWf–6W2‚’°¢–b‚æf–vF÷"æÖVF–FWf–6W3òæVçVÖW&FTFWf–6W2’&WGW&â²6ÖW&3¢µÒÂÖ–7&÷†öæW3¢µÒÓ°¢6öç7BÆÂÒv—Bæf–vF÷"æÖVF–FWf–6W2æVçVÖW&FTFWf–6W2‚“°¢&WGW&â²6ÖW&3¢ÆÂæf–ÇFW"†BÓâBæ¶–æBÓÓÒwf–FVö–çWBr’ÂÖ–7&÷†öæW3¢ÆÂæf–ÇFW"†BÓâBæ¶–æBÓÓÒvVF–ö–çWBr’Ó°¢Ğ ¢f–FVô–æfò‚’°¢6öç7BG&6²ÒF†—2ç7G&VÓòævWEf–FVõG&6·2‚•³Ó°¢&WGW&âG&6²ò²6WGF–æw3¢G&6²ævWE6WGF–æw2‚’Â6&–Æ—F–W3¢G&6²ævWD6&–Æ—F–W3òâ‚’Ò¢VæFVf–æVC°¢Ğ ¢FövvÆR†¶–æC¢vVF–òrÂwf–FVòr’°¢6öç7BG&6²Ò¶–æBÓÓÒvVF–òròF†—2ç7G&VÓòævWDVF–õG&6·2‚•³Ò¢F†—2ç7G&VÓòævWEf–FVõG&6·2‚•³Ó°¢–b‡G&6²’G&6²æVæ&ÆVBÒG&6²æVæ&ÆVC°¢&WGW&âG&6³òæVæ&ÆVBóòfÇ6S°¢Ğ ¢7F÷‚’²F†—2ç7G&VÓòævWEG&6·2‚’æf÷$V6‚‡BÓâBç7F÷‚’“²F†—2ç7G&VÒÒVæFVf–æVC²Ğ§Ğ