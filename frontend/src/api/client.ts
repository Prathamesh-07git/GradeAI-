// Vite sets import.meta.env.PROD to true automatically during `npm run build`.
// This guarantees the correct URL is used in production without any env vars.
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || (
  import.meta.env.PROD
    ? "https://gradeai-iggp.onrender.com/api"
    : "http://localhost:8000/api"
);

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("token");
  
  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !endpoint.includes("/auth/")) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Only redirect if we are not already on login or register page
    if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/register")) {
      window.location.href = "/login?expired=true";
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // Handle empty or 204 responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
