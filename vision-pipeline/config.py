"""
Config for one worker process = one camera. Everything is an env var so
you can launch multiple workers (one per camera) with different values
and no code changes — e.g. via a process manager or a docker-compose
service per camera.
"""
import os

# --- Camera / ingest identity ---
CAMERA_SOURCE = os.environ.get("CAMERA_SOURCE", "0")  # RTSP URL, video file path, or webcam index
INGEST_KEY = os.environ.get("INGEST_KEY")  # required — from POST /api/locations/:id/cameras
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:4000")

# --- Detector ---
DETECTOR_BACKEND = os.environ.get("DETECTOR_BACKEND", "haar")  # "haar" or "yunet"
YUNET_MODEL_PATH = os.environ.get("YUNET_MODEL_PATH", "models/face_detection_yunet.onnx")
DETECT_EVERY_N_FRAMES = int(os.environ.get("DETECT_EVERY_N_FRAMES", "5"))
MAX_MISSED_DETECTIONS = int(os.environ.get("MAX_MISSED_DETECTIONS", "6"))

# --- Output ---
HLS_OUTPUT_DIR = os.environ.get("HLS_OUTPUT_DIR", "./hls_output")
OUTPUT_FPS = int(os.environ.get("OUTPUT_FPS", "15"))  # per the plan: no need for high fps,
                                                        # a few seconds of latency is fine

# --- Playback ---
# The worker serves its own HLS output over plain HTTP so a browser can
# play it directly. This only works when whoever's viewing can actually
# reach this host/port — fine on a shared LAN or localhost, NOT a
# production answer for a remote camera on a different network. See the
# note on Stream.playbackUrl in the backend.
PLAYBACK_HOST = os.environ.get("PLAYBACK_HOST", "localhost")
PLAYBACK_PORT = int(os.environ.get("PLAYBACK_PORT", "8081"))

# --- Health reporting cadence ---
HEARTBEAT_INTERVAL_SECONDS = int(os.environ.get("HEARTBEAT_INTERVAL_SECONDS", "10"))
BLUR_HEALTH_CHECK_INTERVAL_SECONDS = int(os.environ.get("BLUR_HEALTH_CHECK_INTERVAL_SECONDS", "15"))

# If the detector finds zero faces across this many consecutive detection
# cycles right after startup, something is more likely wrong with the
# camera framing/focus than the room being genuinely empty that long — used
# only to log a warning, never to silently mark the stream healthy.
STARTUP_ZERO_FACE_WARN_CYCLES = 20
