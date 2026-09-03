import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchLocationById } from "../api/locations";
import StatusPill from "../components/StatusPill";
import StateMessage from "../components/StateMessage";
import "./LocationDetail.css";

export default function LocationDetail() {
  const { id } = useParams();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    fetchLocationById(id)
      .then((data) => {
        if (!cancelled) setLocation(data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="page">
        <StateMessage title="Loading…" />
      </main>
    );
  }

  if (notFound || !location) {
    return (
      <main className="page">
        <StateMessage
          title="This location isn't available"
          body="It may have been removed, or its camera isn't currently public."
          action={
            <Link to="/" className="btn btn--primary">
              Back to nearby places
            </Link>
          }
        />
      </main>
    );
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    location.address
  )}`;

  return (
    <main className="page">
      <Link to="/" className="detail__back">
        ← Nearby places
      </Link>

      <div className="detail__stream">
        <span className="detail__stream-note">Live view coming soon</span>
      </div>

      <div className="detail__header">
        <h1 className="detail__name">{location.name}</h1>
        <StatusPill status={location.status} />
      </div>

      <p className="detail__category">{location.categoryId?.name}</p>
      <p className="detail__address">{location.address}</p>

      <div className="detail__actions">
        <a className="btn btn--primary" href={mapsUrl} target="_blank" rel="noreferrer">
          Get directions
        </a>
        {location.businessId?.website && (
          <a
            className="btn btn--ghost"
            href={location.businessId.website}
            target="_blank"
            rel="noreferrer"
          >
            Visit website
          </a>
        )}
      </div>
    </main>
  );
}
