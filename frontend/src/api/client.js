import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
});

// Attach the JWT (if the person is logged in) to every request. The
// consumer-facing pages never have a token, so this is a no-op for them —
// only the dashboard pages ever actually have something in storage.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("keepalive_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
