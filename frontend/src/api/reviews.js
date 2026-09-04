import apiClient from "./client";
import { getSessionId } from "../utils/session";

export async function fetchReviewTags(locationId) {
  const { data } = await apiClient.get(`/api/locations/${locationId}/reviews/tags`);
  return data;
}

export async function fetchReviewSummary(locationId) {
  const { data } = await apiClient.get(`/api/locations/${locationId}/reviews/summary`);
  return data; // { totalReviews, tagCounts }
}

export async function submitReview(locationId, tags) {
  const { data } = await apiClient.post(`/api/locations/${locationId}/reviews`, {
    tags,
    sessionId: getSessionId(),
  });
  return data;
}
