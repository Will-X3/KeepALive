import { useEffect, useState } from "react";
import { useGeolocation } from "../hooks/useGeolocation";
import { fetchCategories, fetchNearbyLocations } from "../api/locations";
import LocationPrompt from "../components/LocationPrompt";
import CategoryFilter from "../components/CategoryFilter";
import LocationCard from "../components/LocationCard";
import StateMessage from "../components/StateMessage";

export default function Home() {
  const { coords, status, request, useDemoLocation } = useGeolocation();

  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {
        /* category chips are a nice-to-have; a failed fetch shouldn't block the page */
      });
  }, []);

  useEffect(() => {
    if (!coords) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchNearbyLocations({
      lat: coords.lat,
      lng: coords.lng,
      category: activeCategory || undefined,
    })
      .then((data) => {
        if (!cancelled) setLocations(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load nearby places. Check that the API is running.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coords, activeCategory]);

  if (!coords) {
    return (
      <main className="page">
        <LocationPrompt status={status} onRequest={request} onUseDemo={useDemoLocation} />
      </main>
    );
  }

  return (
    <main className="page">
      <div className="home__filters">
        <CategoryFilter
          categories={categories}
          activeSlug={activeCategory}
          onSelect={setActiveCategory}
        />
      </div>

      {loading && <StateMessage title="Looking nearby…" />}

      {!loading && error && (
        <StateMessage
          title="Something went wrong"
          body={error}
          action={
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setActiveCategory((c) => c)}
            >
              Try again
            </button>
          }
        />
      )}

      {!loading && !error && locations.length === 0 && (
        <StateMessage
          title="Nothing nearby yet"
          body="No participating locations within range. KeepALive is early — check back as more businesses join."
        />
      )}

      {!loading && !error && locations.length > 0 && (
        <div className="home__list">
          {locations.map((loc) => (
            <LocationCard key={loc._id} location={loc} />
          ))}
        </div>
      )}
    </main>
  );
}
