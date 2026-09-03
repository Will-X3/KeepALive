import "./StateMessage.css";
import { DEMO_LOCATION } from "../hooks/useGeolocation";

export default function LocationPrompt({ status, onRequest, onUseDemo }) {
  return (
    <div className="state-message">
      <h2 className="state-message__title">Find what's happening near you</h2>
      <p className="state-message__body">
        Share your location and KeepALive shows how busy nearby places are right now.
      </p>
      <div className="state-message__actions">
        <button type="button" className="btn btn--primary" onClick={onRequest}>
          {status === "locating" ? "Locating…" : "Use my location"}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onUseDemo}>
          Try {DEMO_LOCATION.label}
        </button>
      </div>
      {status === "denied" && (
        <p className="state-message__note">
          Location access was blocked. You can still try the demo location above, or allow
          location access for this site in your browser settings.
        </p>
      )}
      {status === "unsupported" && (
        <p className="state-message__note">
          This browser doesn't support location access. Try the demo location instead.
        </p>
      )}
    </div>
  );
}
