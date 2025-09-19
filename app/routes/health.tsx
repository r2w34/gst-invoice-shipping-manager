import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  // Basic health check
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "GST Invoice & Shipping Manager",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
  };

  return json(health, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}

// Handle all HTTP methods for health check
export const action = loader;