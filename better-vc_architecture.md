# Better-VC Architecture

## Project Goal

Better-VC is a personal 1-to-1 WebRTC video calling web app focused on preserving the highest practical video quality under unstable or low-bandwidth network conditions.

Primary priorities:

1. Preserve face clarity.
2. Preserve resolution.
3. Reduce frame rate before reducing resolution below 720p.
4. Keep audio stable.
5. Keep latency low.
6. Keep infrastructure minimal.
7. UI quality is not a priority.

---

## Core Design

Better-VC uses direct peer-to-peer WebRTC for audio and video whenever possible.

```text
                    BETTER-VC

               Signaling Server
               Node.js/WebSocket
                     |
               SDP + ICE only
                /           \
               /             \
          Client A          Client B
               \             /
                \           /
                 WebRTC P2P
                Audio + Video
```

The signaling server does not normally carry media.

Supporting services:

- STUN: used to discover public-facing network information.
- TURN: relay fallback when direct P2P connectivity cannot be established.

---

## Client-Side Architecture

```text
Camera + Microphone
        |
        v
Media Capture Manager
        |
        v
Optional Video Preprocessor
        |
        v
WebRTC Encoder / RTCPeerConnection
        |
        +--------------------------+
        |                          |
        v                          v
Remote Peer                 Network Monitor
                              getStats()
                                  |
                                  v
                         Quality Controller
                                  |
                                  v
                     Resolution / FPS / Bitrate
```

Most Better-VC logic runs locally in the browser.

---

## Main Modules

### 1. Media Capture Manager

Responsibilities:

- Request camera and microphone access.
- Detect camera capabilities.
- Request highest useful native capture quality.
- Read actual camera settings.
- Apply resolution and frame-rate constraints.
- Expose local MediaStream tracks to the WebRTC layer.

Important browser APIs:

- navigator.mediaDevices.getUserMedia()
- MediaStreamTrack.getCapabilities()
- MediaStreamTrack.getSettings()
- MediaStreamTrack.applyConstraints()

---

### 2. WebRTC Engine

Responsibilities:

- Create RTCPeerConnection.
- Add local audio/video tracks.
- Exchange SDP offer/answer.
- Exchange ICE candidates.
- Handle connection state changes.
- Detect negotiated codec.
- Access RTCRtpSender for bitrate/FPS control.

Core components:

- RTCPeerConnection
- RTCRtpSender
- ICE
- STUN
- TURN

---

### 3. Signaling Client

Responsibilities:

- Connect to signaling server with WebSocket.
- Create or join a room.
- Send:
  - offer
  - answer
  - ICE candidate
- Receive signaling messages from the other peer.

The signaling server only coordinates connection setup.

---

### 4. Signaling Server

Recommended stack:

- Node.js
- TypeScript
- WebSocket or Socket.IO

Responsibilities:

- Maintain temporary room IDs.
- Allow two peers per room.
- Relay signaling messages.
- Delete room state when peers leave.

No database is required for the first version.

---

## Quality Controller

The Quality Controller is the most important Better-VC component.

Its purpose is to preserve visual clarity by intentionally controlling resolution, frame rate, and bitrate.

### Preferred degradation order

```text
1080p @ 30 fps
        |
        v
720p @ 30 fps
        |
        v
720p @ 24 fps
        |
        v
720p @ 20 fps
        |
        v
720p @ 15 fps
        |
        v
720p @ 10 fps
        |
        v
480p @ 15 fps
        |
        v
480p @ 10 fps
        |
        v
360p @ 10 fps
```

Key rule:

> Once the stream reaches 720p, reduce frame rate several times before reducing resolution again.

---

## Network Monitor

Use RTCPeerConnection.getStats() periodically.

Recommended sampling interval:

- about once every 1 second

Track:

- actual outgoing bitrate
- packets sent
- packet loss
- round-trip time
- jitter
- frames encoded
- frames sent
- frames dropped
- frame width
- frame height
- frames per second
- qualityLimitationReason
- codec
- candidate-pair type
- available outgoing bitrate when available

---

## Stability Logic

Do not switch quality levels on every bad sample.

Use smoothing and hysteresis.

Recommended behavior:

```text
Bad network sustained for ~2-3 seconds
                |
                v
      downgrade one level
```

Recovery should be slower:

```text
Good network sustained for ~8-10 seconds
                |
                v
       upgrade one level
```

This prevents constant quality oscillation.

---

## Manual Quality Mode

Before implementing automatic adaptation, add manual quality profiles.

Suggested profiles:

- 1080p30
- 720p30
- 720p24
- 720p20
- 720p15
- 720p10
- 480p15
- 480p10
- 360p10

This is useful for testing real visual quality before tuning the automatic controller.

---

## Codec Strategy

Do not permanently assume one codec is best.

Test available codecs on the actual devices Better-VC will use.

Candidate codecs:

- AV1
- VP9
- VP8
- H.264

Selection should consider:

- browser support
- hardware acceleration
- CPU usage
- encoder stability
- quality at a fixed bitrate
- latency
- dropped frames

For a personal app, device-specific optimization is acceptable.

---

## Audio Strategy

Video quality is the priority, but audio must remain usable.

Reserve enough bandwidth for audio and protocol overhead before assigning the rest to video.

Do not allow video to completely starve audio.

---

## Face Detection Module

Add only after basic WebRTC and quality adaptation are stable.

Recommended initial approach:

- Run face detection locally.
- Do not send frames to an AI server.
- Detect face at approximately 5-10 FPS.
- Track or reuse the face position between detections.
- Avoid modifying the face itself initially.

Possible implementation:

- MediaPipe
- ONNX Runtime Web

---

## Face-Aware Video Processing

Later phase only.

Concept:

```text
Original Frame
      |
      v
Face Detection
      |
      +----------------------+
      |                      |
      v                      v
Face ROI                 Background
preserve detail       light simplification
      |                      |
      +----------+-----------+
                 |
                 v
         Processed Frame
                 |
                 v
          WebRTC Encoder
```

The purpose is not beautification.

The purpose is to reduce unnecessary visual complexity outside the face so the encoder can spend more of the available bitrate on perceptually important detail.

Potential preprocessing:

- light denoising
- slight background smoothing
- optional mild background detail reduction

Avoid:

- heavy blur
- aggressive sharpening
- AI-generated face reconstruction
- obvious visual artifacts

---

## CPU-Aware Adaptation

The controller should distinguish network limitations from CPU/encoder limitations.

Example:

```text
qualityLimitationReason = bandwidth
        -> lower video bitrate/FPS

qualityLimitationReason = cpu
        -> reduce preprocessing or encoding load
```

This prevents lowering network quality when the real problem is local processing.

---

## TURN Behavior

Preferred path:

```text
Client A <------ direct P2P ------> Client B
```

Fallback:

```text
Client A <------ TURN ------> Client B
```

TURN should be available for reliability, but direct P2P should be preferred.

---

## Suggested Project Structure

```text
better-vc/
|
+-- client/
|   |
|   +-- src/
|       |
|       +-- webrtc/
|       |   +-- peer.ts
|       |   +-- signaling.ts
|       |   +-- media.ts
|       |   +-- stats.ts
|       |
|       +-- quality/
|       |   +-- controller.ts
|       |   +-- qualityLevels.ts
|       |   +-- networkMonitor.ts
|       |
|       +-- video/
|       |   +-- processor.ts
|       |   +-- faceDetector.ts
|       |   +-- denoise.ts
|       |
|       +-- ui/
|       |   +-- diagnostics.ts
|       |
|       +-- main.ts
|
+-- signaling/
|   +-- server.ts
|   +-- rooms.ts
|
+-- shared/
|   +-- types.ts
|
+-- tests/
|   +-- bandwidth/
|   +-- connection/
|
+-- docs/
|   +-- architecture.md
|   +-- phases.md
|
+-- package.json
+-- README.md
```

---

## Minimal Runtime Architecture

```text
Browser A
  |
  +-- camera
  +-- microphone
  +-- quality controller
  +-- WebRTC
  |
  +============== P2P ==============+
                                     |
                                  Browser B

Both browsers
      |
      +---- signaling server
      |
      +---- STUN
      |
      +---- TURN fallback
```

---

## Recommended V1 Scope

V1 should include only:

- 1-to-1 calling
- room create/join
- direct P2P WebRTC
- STUN
- TURN fallback
- camera/microphone selection
- 1080p and 720p support
- diagnostics
- manual quality modes
- automatic bandwidth adaptation
- codec testing

Do not make face detection mandatory for V1.

---

## Better-VC Design Principle

Better-VC should optimize for:

```text
Face clarity
    >
Resolution
    >
Audio stability
    >
Low latency
    >
Frame rate
    >
UI appearance
```

The central engineering goal is:

> Maintain 720p or better for as long as practical, and sacrifice frame rate before sacrificing spatial clarity.
