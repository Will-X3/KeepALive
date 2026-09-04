# KeepALive Vision Pipeline

Face detection + blur + HLS packaging, one worker process per camera. This
is genuinely tested, not just written — see "What was actually verified"
below before you trust it with a real camera.

## Setup

```bash
cd vision-pipeline
pip install -r requirements.txt
python test_pipeline.py     # sanity check: no camera, no backend needed
```

That should print a detection result and write
`test-assets/lena_blurred.jpg` — open it and confirm the face is actually
blurred. If that doesn't work, nothing downstream will either.

## Running against a real camera

```bash
CAMERA_SOURCE=rtsp://192.168.1.50:554/stream1 \
INGEST_KEY=<the ingestKey from POST /api/locations/:id/cameras> \
BACKEND_URL=http://localhost:4000 \
HLS_OUTPUT_DIR=./hls_output \
python worker.py
```

`CAMERA_SOURCE` can be an RTSP URL, a path to a video file (useful for
testing without a physical camera), or a webcam index like `0`. All config
is env vars — see `config.py` for the full list and defaults.

One worker process per camera. For multiple cameras, run multiple worker
processes with different `CAMERA_SOURCE`/`INGEST_KEY` values — there's no
shared state between them.

## Upgrading the detector: Haar -> YuNet

Ships defaulting to OpenCV's bundled Haar cascade so it works with zero
downloads. **Switch to YuNet before running this on a real business
camera** — Haar noticeably misses faces at angles, partial occlusion, and
in low light, and for a privacy product a missed face is a failure, not a
rounding error.

```bash
mkdir -p models
curl -L -o models/face_detection_yunet.onnx \
  https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx
```

Then run with `DETECTOR_BACKEND=yunet`. Everything else (tracking, worker,
backend reporting) is identical — the detector is fully pluggable, see
`face_blur_pipeline.py`.

(This sandbox couldn't fetch that file itself — the model's stored via
git-lfs, which resolves through a host outside what this container can
reach. It'll work fine from your machine.)

## How it fits together

```
camera --> cv2.VideoCapture --> FaceBlurPipeline --> ffmpeg --> HLS files
                                       |
                          detect every N frames,
                          track/interpolate between
                                       |
                    reporting_loop (background thread)
                                       |
                    POST /api/ingest/heartbeat     (connectivity)
                    POST /api/ingest/blur-health   (pipeline health)
                    POST /api/ingest/event         (on any failure)
```

- **`face_blur_pipeline.py`** — the actual CV: `FaceTracker` (centroid
  matching between detections) + `FaceBlurPipeline` (runs the detector on
  a schedule, blurs every frame). No I/O, no network — this is the part
  with real unit-testable logic, kept separate on purpose.
- **`worker.py`** — ties video capture, the pipeline, ffmpeg, and backend
  reporting together. This is where the fail-closed rules actually live.
- **`backend_client.py`** — thin wrapper around the three ingest endpoints.
  Best-effort: a backend outage logs a warning and keeps the worker
  running, but never gets treated as "healthy."
- **`config.py`** — every tunable is an env var, so you can run several
  workers (one per camera) from the same code with no edits.

## The fail-closed rules — the actual point of this pipeline

1. **A frame that raises during detection/blur is never forwarded to
   ffmpeg.** No unblurred frame can reach the output, period — verified in
   testing by feeding the pipeline a malformed frame and confirming
   nothing gets written on that iteration.
2. **`blur-health` is only ever reported `healthy: true` while frames are
   currently processing without error.** The instant that stops being
   true, the next health check (every `BLUR_HEALTH_CHECK_INTERVAL_SECONDS`)
   reports `false` — which is what makes the backend refuse to let the
   location go `"live"` (see `locationController.setVisibility`).
3. **Camera disconnects and ffmpeg crashes both stop the worker and report
   the specific failure type** (`disconnected` / `transcoding_failure`) —
   not a generic error, so `StreamEvent` history actually tells you what
   happened.
4. **A tracked face that stops being redetected eventually drops** (default:
   after ~6 missed detection cycles, tunable via `MAX_MISSED_DETECTIONS`)
   rather than blurring a stale box forever — but errs conservative by
   default, since lingering blur on empty background is a much smaller
   problem than a box that vanishes the instant tracking gets shaky.

## What was actually verified in this sandbox vs. what wasn't

**Verified, with real output:**
- Face detection + blur on a real photo (visually confirmed, not just
  logged)
- Detect-every-N-frames scheduling + tracking carry-forward across a
  frame sequence
- A track correctly aging out and dropping once a face is genuinely gone
- The full pipeline end-to-end: synthetic video -> blur -> ffmpeg -> real
  HLS `.m3u8` + `.ts` files -> extracted a frame from the *encoded output*
  and confirmed the blur survived the full encode, not just the
  in-memory array
- The fail-closed exception path: a malformed frame correctly raises
  rather than silently passing through
- The worker surviving a fully unreachable backend without crashing

**Not verified here (needs your machine / real hardware):**
- An actual RTSP camera (this sandbox has none)
- The YuNet model itself (couldn't download it here — see above)
- Multi-camera concurrent load / real CPU cost at scale
- The full loop against your actual running Node backend + MongoDB
