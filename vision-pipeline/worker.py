"""
One worker process per camera.

  python worker.py

Reads CAMERA_SOURCE (RTSP URL / video file / webcam index), runs every
frame through the blur pipeline, and pipes the blurred output into ffmpeg
for HLS packaging. Separately, on their own timers, reports connectivity
(heartbeat) and pipeline health (blur-health) to the Node backend.

Fail-closed behavior, the actual point of this file:
  - If the detector/blur step raises, we STOP forwarding frames to ffmpeg
    immediately (better a frozen/stalled stream than one unblurred frame
    published) and report a blur_failure event.
  - If the camera read fails (disconnect, end of file, bad RTSP), we stop
    and report a disconnected event.
  - blur-health is only ever reported healthy=True while frames are
    actively being processed without error. The moment that stops being
    true, the next health check reports healthy=False, which is what
    finally moves the backend's Stream.publicState away from "live".
"""
import logging
import subprocess
import sys
import threading
import time

import cv2

import config
import backend_client
from face_blur_pipeline import FaceBlurPipeline

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("worker")


class WorkerState:
    """Shared state between the capture loop and the reporting thread."""

    def __init__(self):
        self.lock = threading.Lock()
        self.pipeline_healthy = False
        self.last_frame_processed_at = None
        self.consecutive_errors = 0

    def mark_success(self):
        with self.lock:
            self.pipeline_healthy = True
            self.last_frame_processed_at = time.time()
            self.consecutive_errors = 0

    def mark_failure(self):
        with self.lock:
            self.pipeline_healthy = False
            self.consecutive_errors += 1

    def snapshot_healthy(self):
        with self.lock:
            return self.pipeline_healthy


def start_ffmpeg_hls_writer(width, height, fps):
    """Spawns ffmpeg reading raw BGR frames from stdin, writing an HLS
    playlist + segments to config.HLS_OUTPUT_DIR. Returns the Popen handle;
    write raw frame bytes to its stdin.
    """
    import os

    os.makedirs(config.HLS_OUTPUT_DIR, exist_ok=True)

    cmd = [
        "ffmpeg",
        "-y",
        "-f", "rawvideo",
        "-pixel_format", "bgr24",
        "-video_size", f"{width}x{height}",
        "-framerate", str(fps),
        "-i", "-",  # read raw frames from stdin
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-tune", "zerolatency",
        "-g", str(fps * 2),  # keyframe every 2s, standard for HLS segment alignment
        "-f", "hls",
        "-hls_time", "4",
        "-hls_list_size", "6",
        "-hls_flags", "delete_segments",
        f"{config.HLS_OUTPUT_DIR}/stream.m3u8",
    ]
    logger.info("starting ffmpeg: %s", " ".join(cmd))
    return subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)


def reporting_loop(state):
    """Runs in a background thread: heartbeats on its own cadence, and
    reports blur-health based on whether the capture loop is currently
    processing frames successfully. This is deliberately decoupled from the
    capture loop so a slow/stuck frame doesn't also block health reporting.
    """
    last_heartbeat = 0
    last_blur_health = 0

    while True:
        now = time.time()

        if now - last_heartbeat >= config.HEARTBEAT_INTERVAL_SECONDS:
            backend_client.send_heartbeat()
            last_heartbeat = now

        if now - last_blur_health >= config.BLUR_HEALTH_CHECK_INTERVAL_SECONDS:
            backend_client.report_blur_health(state.snapshot_healthy())
            last_blur_health = now

        time.sleep(1)


def run():
    if not config.INGEST_KEY:
        logger.error("INGEST_KEY is required (set it in the environment)")
        sys.exit(1)

    source = int(config.CAMERA_SOURCE) if config.CAMERA_SOURCE.isdigit() else config.CAMERA_SOURCE
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        logger.error("Could not open camera source: %s", source)
        backend_client.report_event("ingest_failure", f"Could not open source {source}")
        sys.exit(1)

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480

    pipeline = FaceBlurPipeline(
        backend=config.DETECTOR_BACKEND,
        model_path=config.YUNET_MODEL_PATH,
        detect_every_n_frames=config.DETECT_EVERY_N_FRAMES,
        max_missed_detections=config.MAX_MISSED_DETECTIONS,
    )

    ffmpeg_proc = start_ffmpeg_hls_writer(width, height, config.OUTPUT_FPS)

    state = WorkerState()
    threading.Thread(target=reporting_loop, args=(state,), daemon=True).start()

    backend_client.report_event("connected", f"Worker started for source {source}")
    logger.info(
        "Worker running: %sx%s @ %sfps, backend=%s",
        width, height, config.OUTPUT_FPS, config.DETECTOR_BACKEND,
    )

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                logger.error("Camera read failed — stream ended or disconnected")
                backend_client.report_event("disconnected", "cap.read() returned False")
                state.mark_failure()
                break

            try:
                blurred, meta = pipeline.process_frame(frame)
            except Exception as exc:  # noqa: BLE001 - deliberately broad:
                # ANY detector/blur failure must fail closed, not just
                # known/expected exception types.
                logger.exception("Blur pipeline failed on this frame")
                backend_client.report_event("blur_failure", str(exc))
                state.mark_failure()
                # Do not write this frame. Skipping publication is the
                # whole point — an unblurred frame must never reach ffmpeg.
                continue

            state.mark_success()

            try:
                ffmpeg_proc.stdin.write(blurred.tobytes())
            except BrokenPipeError:
                logger.error("ffmpeg process died — stopping worker")
                backend_client.report_event("transcoding_failure", "ffmpeg pipe closed")
                state.mark_failure()
                break

    finally:
        cap.release()
        if ffmpeg_proc.stdin:
            ffmpeg_proc.stdin.close()
        ffmpeg_proc.wait(timeout=5)
        backend_client.report_blur_health(False)
        logger.info("Worker stopped")


if __name__ == "__main__":
    run()
