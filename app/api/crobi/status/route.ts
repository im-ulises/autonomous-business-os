import { NextResponse } from "next/server";

export async function GET() {
  const configured = process.env.CROBI_API_URL?.trim();
  if (!configured) {
    return NextResponse.json({ configured: false, connected: false, label: "Sin conexión configurada" });
  }
  try {
    const url = new URL(configured);
    // Don't send private credentials over plaintext connections in production.
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
      return NextResponse.json({ configured: true, connected: false, label: "HTTPS requerido" });
    }
    if (!["http:", "https:"].includes(url.protocol)) throw Error("Unsupported protocol");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const headers: Record<string, string> = {};
      if (process.env.CROBI_SERVICE_TOKEN) headers.Authorization = "Bearer " + process.env.CROBI_SERVICE_TOKEN;
      const response = await fetch(new URL("/health", url), { headers, cache: "no-store", signal: controller.signal });
      return NextResponse.json({
        configured: true,
        connected: response.ok,
        label: response.ok ? "Servicio accesible" : "No disponible",
      });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return NextResponse.json({ configured: true, connected: false, label: "Conexión fallida" });
  }
}
