import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import "./VideoPlayer.css";

export default function VideoPlayer({ src, muted = true }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError(null);

    // Safari has native HLS support and actively dislikes hls.js being
    // used on top of it — check this first.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        // A live "is it busy" feed doesn't need low-latency tuning — a
        // few seconds behind is fine (matches the product's own stance
        // that this isn't a video-call product). Default settings are fit
        // for purpose here.
      });
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError(
            "Couldn't load the stream. The camera worker may not be running, or its playback URL isn't reachable from here."
          );
        }
      });

      return () => hls.destroy();
    }

    setError("This browser can't play this stream format.");
  }, [src]);

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        className="video-player__video"
        autoPlay
        muted={muted}
        playsInline
        controls
      />
      {error && <div className="video-player__error">{error}</div>}
    </div>
  );
}
