import { DurableObject } from "cloudflare:workers";

const CONTAINER_PORT = 8000;
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const REQUIRED = ["DATABASE_URL", "JWT_ISSUER", "JWT_AUDIENCE", "JWT_JWKS_URL"];

export class AutonomousApiContainer extends DurableObject {
  starting;

  async fetch(request) {
    this.starting ??= this.startAndWait().finally(() => { this.starting = undefined; });
    await this.starting;
    const url = new URL(request.url);
    url.protocol = "http:";
    url.host = "container";
    const forwarded = new Request(url, request);
    forwarded.headers.delete("host");
    forwarded.headers.set("x-forwarded-proto", "https");
    return this.ctx.container.getTcpPort(CONTAINER_PORT).fetch(forwarded);
  }

  async startAndWait() {
    const container = this.ctx.container;
    if (!container) throw new Error("Cloudflare Container support unavailable");
    if (!container.running) {
      container.start({
        image: container.images.base,
        instance: "basic",
        enableInternet: true,
        env: {
          DATABASE_URL: this.env.DATABASE_URL,
          JWT_ISSUER: this.env.JWT_ISSUER,
          JWT_AUDIENCE: this.env.JWT_AUDIENCE,
          JWT_JWKS_URL: this.env.JWT_JWKS_URL,
          CORS_ORIGINS: this.env.CORS_ORIGINS ?? "",
        },
      });
    }
    await container.setInactivityTimeout(IDLE_TIMEOUT_MS);
    const port = container.getTcpPort(CONTAINER_PORT);
    let lastError;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      try {
        const response = await port.fetch("http://container/healthz", {
          signal: AbortSignal.timeout(1200),
        });
        await response.body?.cancel();
        if (response.ok) return;
        lastError = new Error("Health endpoint not ready: " + response.status);
      } catch (error) { lastError = error; }
      await scheduler.wait(250);
    }
    throw new Error("FastAPI container failed readiness", {cause: lastError});
  }
}

export default {
  fetch(request, env) {
    if (new URL(request.url).pathname === "/edge-healthz") {
      return Response.json({status:"up", service:"autonomous-os-edge"});
    }
    if (REQUIRED.some(key => !env[key])) {
      return Response.json({detail:"Backend is not provisioned"}, {
        status:503, headers:{"cache-control":"no-store"}
      });
    }
    return env.API_CONTAINER.getByName("api-v1").fetch(request);
  },
};
