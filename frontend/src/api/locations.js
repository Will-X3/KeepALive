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
