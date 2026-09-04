import apiClient from "./client";

export async function fetchMyBusinesses() {
  const { data } = await apiClient.get("/api/businesses/mine");
  return data;
}

export async function fetchBusinessById(id) {
  const { data } = await apiClient.get(`/api/businesses/${id}`);
  return data;
}

export async function createBusiness({ name, website, phone }) {
  const { data } = await apiClient.post("/api/businesses", { name, website, phone });
  return data;
}

export async function updateBusiness(id, updates) {
  const { data } = await apiClient.patch(`/api/businesses/${id}`, updates);
  return data;
}

export async function updateBusinessSettings(id, settings) {
  const { data } = await apiClient.patch(`/api/businesses/${id}/settings`, settings);
  return data;
}
