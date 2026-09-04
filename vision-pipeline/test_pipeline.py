"""
Standalone sanity check — no camera, no backend, no ffmpeg required.
Confirms face detection + blur actually works on your machine before you
plug in a real camera.

  python test_pipeline.py

Writes test-assets/lena_blurred.jpg — open it and confirm the face is
actually obscured, don't just trust the console output.
"""
import cv2
from face_blur_pipeline import FaceBlurPipeline

img = cv2.imread("test-assets/lena.jpg")
if img is None:
    raise SystemExit("Couldn't load test-assets/lena.jpg — run this from the vision-pipeline/ folder")

pipeline = FaceBlurPipeline(backend="haar", detect_every_n_frames=1)
output, meta = pipeline.process_frame(img)

print("Detection result:", meta)
if meta["faces_tracked"] == 0:
    print("WARNING: no face detected — something's wrong before you even get to a real camera.")
else:
    cv2.imwrite("test-assets/lena_blurred.jpg", output)
    print("Wrote test-assets/lena_blurred.jpg — open it and confirm the face is blurred.")
