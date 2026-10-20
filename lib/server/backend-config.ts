const LOCAL_BACKEND_API_BASE_URL = "http://localhost:5000/api/v1";

export const getBackendApiBaseUrl = () => {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || process.env.BACKEND_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_BASE_URL or BACKEND_API_BASE_URL must be configured in production.");
  }

  return LOCAL_BACKEND_API_BASE_URL;
};

export const buildBackendUrl = (path: string) =>
  `${getBackendApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

export const applyBackendCompatibilityHeaders = (headers: Headers) => {
  try {
    const apiUrl = new URL(getBackendApiBaseUrl());
    if (apiUrl.hostname.includes("ngrok")) {
      headers.set("ngrok-skip-browser-warning", "true");
    }
  } catch {
    // URL validation is handled by fetch; keep caller-provided headers intact.
  }

  return headers;
};
