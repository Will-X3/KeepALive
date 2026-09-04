import apiClient from "./client";

/**
 * @param {{ lat: number, lng: number, radiusKm?: number, category?: string, liveOnly?: boolean }} params
 */
export async function fetchNearbyLocations({ lat, lng, radiusKm = 15, category, liveOnly }) {
  const { data } = await apiClient.get("/api/locations", {
    params: {
      lat,
      lng,
      radiusKm,
      ...(category ? { category } : {}),
      ...(liveOnly ? { liveOnly: "true" } : {}),
    },
  });
  return data;
}

export async function fetchLocationById(id) {
  const { data } = await apiClient.get(`/api/locations/${id}`);
  return data;
}

export async function fetchCategories() {
  const { data } = await apiClient.get("/api/categories");
  return data;
}

// --- Business-owner side (dashboard) ---

export async function createLocation(payload) {
  // payload: { businessId, categoryId, name, address, lat, lng, timezone, hours? }
  const { data } = await apiClient.post("/api/locations", payload);
  return data;
}

export async function updateLocation(id, updates) {
  const { data } = await apiClient.patch(`/api/locations/${id}`, updates);
  return data;
}

export async function setLocationVisibility(id, status) {
  // status: "live" | "paused"
  const { data } = await apiClient.patch(`/api/locations/${id}/visibility`, { status });
  return data;
}
