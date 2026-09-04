import apiClient from "./client";

export async function fetchCamerasForLocation(locationId) {
  const { data } = await apiClient.get(`/api/locations/${locationId}/cameras`);
  return data;
}

export async function connectCamera(locationId) {
  // Returns { camera, stream, ingestKey, note } — ingestKey is only ever
  // sent in full here and from rotateIngestKey. Never persisted client-side.
  const { data } = await apiClient.post(`/api/locations/${locationId}/cameras`);
  return data;
}

export async function rotateIngestKey(cameraId) {
  const { data } = await apiClient.post(`/api/cameras/${cameraId}/rotate-key`);
  return data; // { ingestKey, note }
}

export async function deleteCamera(cameraId) {
  await apiClient.delete(`/api/cameras/${cameraId}`);
}

export async function fetchMyCameras() {
  const { data } = await apiClient.get("/api/cameras/mine");
  return data;
}
