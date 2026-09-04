import apiClient from "./client";

export async function login(email, password) {
  const { data } = await apiClient.post("/api/auth/login", { email, password });
  return data; // { token, user }
}

export async function register(email, password) {
  const { data } = await apiClient.post("/api/auth/register", { email, password });
  return data; // { token, user }
}

export async function fetchMe() {
  const { data } = await apiClient.get("/api/auth/me");
  return data;
}
