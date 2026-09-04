"""
Core face-blur pipeline: detect -> track/interpolate -> blur.

Two detector backends are supported behind one interface:

  - "haar"  — OpenCV's bundled Haar cascade. Zero downloads, works fully
              offline, ships with opencv-python. Noticeably weaker at angles,
              partial occlusion, and low light — fine for local dev/testing,
              NOT what you want live in production.

  - "yunet" — OpenCV's YuNet ONNX model. Meaningfully more accurate, still
              CPU-fast. This is what you should actually run in production —
              a missed face is a privacy failure, not a cosmetic one.
              Download it yourself (this sandbox's network couldn't reach
              the git-lfs host that serves it):

                curl -L -o models/face_detection_yunet.onnx \\
                  https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx

              Then set DETECTOR_BACKEND=yunet (see config.py).

Detection runs every `detect_every_n_frames` frames; face boxes are tracked
between detections with simple centroid matching so blur stays applied to
every frame without running the (more expensive) detector on every frame —
this is the "detect periodically, track/interpolate between" approach the
product plan called for.
"""

import time
import numpy as np
import cv2


class FaceTracker:
    """Minimal centroid tracker: matches new detections to existing tracked
    faces by nearest centroid, so a face's blur box persists smoothly
    between detection frames instead of jumping or disappearing.
    """

    def __init__(self, max_missed_frames=6, match_distance_px=80):
        self.next_id = 0
        self.tracked = {}  # id -> {"box": (x, y, w, h), "missed": int}
        self.max_missed_frames = max_missed_frames
        self.match_distance_px = match_distance_px

    @staticmethod
    def _centroid(box):
        x, y, w, h = box
        return (x + w / 2, y + h / 2)

    def update(self, detections):
        """detections: list of (x, y, w, h) boxes from this frame's
        detector pass. Returns the current list of tracked boxes."""
        unmatched_detections = list(detections)

        for track_id, track in list(self.tracked.items()):
            if not unmatched_detections:
                track["missed"] += 1
                continue

            track_centroid = self._centroid(track["box"])
            distances = [
                np.hypot(
                    track_centroid[0] - self._centroid(d)[0],
                    track_centroid[1] - self._centroid(d)[1],
                )
                for d in unmatched_detections
            ]
            best_idx = int(np.argmin(distances))

            if distances[best_idx] <= self.match_distance_px:
                track["box"] = unmatched_detections.pop(best_idx)
                track["missed"] = 0
            else:
                track["missed"] += 1

        # Drop tracks that have gone too long without a matching detection.
        # Fail-closed instinct applied at the tracker level too: better to
        # stop blurring a box that might be stale than to trust it forever.
        self.tracked = {
            tid: t for tid, t in self.tracked.items() if t["missed"] <= self.max_missed_frames
        }

        # Anything left unmatched is a new face.
        for box in unmatched_detections:
            self.tracked[self.next_id] = {"box": box, "missed": 0}
            self.next_id += 1

        return [t["box"] for t in self.tracked.values()]

    def carry_forward(self):
        """No detection ran this frame — just return last-known boxes
        without penalizing their missed count (they weren't given a chance
        to match anything)."""
        return [t["box"] for t in self.tracked.values()]


class FaceBlurPipeline:
    def __init__(
        self,
        backend="haar",
        model_path=None,
        detect_every_n_frames=5,
        blur_strength=35,
        min_face_size=30,
        max_missed_detections=6,
    ):
        self.backend = backend
        self.detect_every_n_frames = detect_every_n_frames
        self.blur_strength = blur_strength
        self.frame_count = 0
        # max_missed_detections is counted in detection cycles, not raw
        # frames — with detect_every_n_frames=5 and max_missed_detections=6,
        # a track survives ~30 frames (roughly 1-2s at typical fps) after
        # its face stops being redetected before it's dropped. Tune this
        # down if stale blur boxes lingering after someone leaves frame
        # matters more than tolerating brief occlusion; tune it up for the
        # opposite tradeoff.
        self.tracker = FaceTracker(max_missed_frames=max_missed_detections)
        self.last_detect_ms = None

        if backend == "haar":
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            self._detector = cv2.CascadeClassifier(cascade_path)
            if self._detector.empty():
                raise RuntimeError(f"Could not load Haar cascade from {cascade_path}")
            self._min_face_size = (min_face_size, min_face_size)

        elif backend == "yunet":
            if not model_path:
                raise ValueError("model_path is required for the yunet backend")
            # Input size is set per-frame in _detect_yunet once we know the
            # frame's actual dimensions.
            self._detector = cv2.FaceDetectorYN.create(
                model_path, "", (320, 320), score_threshold=0.7
            )
        else:
            raise ValueError(f"Unknown backend: {backend}")

    def _detect_haar(self, frame_gray):
        faces = self._detector.detectMultiScale(
            frame_gray, scaleFactor=1.1, minNeighbors=5, minSize=self._min_face_size
        )
        return [tuple(map(int, f)) for f in faces]

    def _detect_yunet(self, frame):
        h, w = frame.shape[:2]
        self._detector.setInputSize((w, h))
        _, faces = self._detector.detect(frame)
        if faces is None:
            return []
        # YuNet returns [x, y, w, h, <5 landmark points>, score] per face.
        return [tuple(map(int, f[:4])) for f in faces]

    def process_frame(self, frame):
        """Runs detection (on schedule) + tracking + blur. Returns the
        blurred frame and metadata about what happened, so the caller can
        decide whether this frame is safe to publish."""
        start = time.time()
        should_detect = self.frame_count % self.detect_every_n_frames == 0

        if should_detect:
            if self.backend == "haar":
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                detections = self._detect_haar(gray)
            else:
                detections = self._detect_yunet(frame)
            boxes = self.tracker.update(detections)
            self.last_detect_ms = (time.time() - start) * 1000
        else:
            boxes = self.tracker.carry_forward()

        output = frame.copy()
        for x, y, w, h in boxes:
            x, y = max(0, x), max(0, y)
            roi = output[y : y + h, x : x + w]
            if roi.size == 0:
                continue
            # Kernel size must be odd; scale it to the face size so small
            # and large faces both get a genuinely obscuring blur rather
            # than a fixed kernel that's too weak on a close-up face.
            k = max(15, (min(w, h) // 2) | 1)
            blurred_roi = cv2.GaussianBlur(roi, (k, k), 0)
            output[y : y + h, x : x + w] = blurred_roi

        self.frame_count += 1

        return output, {
            "faces_tracked": len(boxes),
            "ran_detection_this_frame": should_detect,
            "last_detect_ms": self.last_detect_ms,
        }
