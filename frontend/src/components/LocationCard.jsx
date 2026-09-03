import { Link } from "react-router-dom";
import StatusPill from "./StatusPill";
import "./LocationCard.css";

export default function LocationCard({ location }) {
  const isLive = location.status === "live";

  return (
    <Link
      to={`/locations/${location._id}`}
      className={`location-card ${isLive ? "location-card--live" : ""}`}
    >
      <div className="location-card__main">
        <div className="location-card__top">
          <h3 className="location-card__name">{location.name}</h3>
          <StatusPill status={location.status} />
        </div>
        <p className="location-card__meta">
          {location.categoryId?.name}
          {typeof location.distanceMeters === "number" && (
            <> · {formatDistance(location.distanceMeters)}</>
          )}
        </p>
        <p className="location-card__address">{location.address}</p>
      </div>
    </Link>
  );
}

function formatDistance(meters) {
  const km = meters / 1000;
  if (km < 1) return `${Math.round(meters)} m away`;
  return `${km.toFixed(1)} km away`;
}
