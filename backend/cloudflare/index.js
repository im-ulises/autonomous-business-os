import { DurableObject } from "cloudflare:workers";

// Each Worker deployment selects a digest-pinned image. Running DO-managed
// Containers are NOT rolled automatically when that image or secrets change.
const PORT = 8000;
const IDLE_MS = 10 * 60 * 1000;
const REQUIRED = ["DATABASE_URL", "DB_EXPECTED_LOGIN", "JWT_ISSUER", "JWT_AUDIENCE", "JWT_JWKS_URL"];
const utf8 = new TextEncoder();

async function configurationFingerprint(image, env) {
  const data = JSON.stringify([image, ...REQUIRED.map(k => env[k]), env.CORS_ORIGINS ?? "", env.APP_ENV ?? "production"]);
  const bytes = await crypto.subtle.digest("SHA-256", utf8.encode(data));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}

export class AutonomousApiContainer extends DurableObject {
  starting;
  readyFor;

  async fetch(request) {
    const container = this.ctx.container;
    if (!container) throw new Error("Missing Container binding");
    const image = container.images.base;
    const fingerprint = await configurationFingerprint(image, this.env);
    if (!(this.readyFor === fingerprint && container.running)) {
      this.starting ??= this.startAndWait(image, fingerprint).finally(() => {
        this.starting = undefined;
      });
      await this.starting;
    }
    const url = new URL(request.url);
    url.protocol = "http:";
    url.host = "container";
    const forwarded = new Request(url, request);
    forwarded.headers.delete("host");
    forwarded.headers.set("x-forwarded-proto", "https");
    return container.getTcpPort(PORT).fetch(forwarded);
  }

  async startAndWait(image, fingerprint) {
    const container = this.ctx.container;
    const current = container.running ? await container.inspect() : null;
    const previousFingerprint = await this.ctx.storage.get("container-config-fingerprint");
    if (container.running && (current?.image !== image || previousFingerprint !== fingerprint)) {
      // DO scheduling policy requires an explicit replacement of a running image.
      await container.destroy("Image or runtime secrets changed");
    }
    if (!container.running) {
      container.start({
        image,
        instance: "standard-1",
        enableInternet: true, // Only the backend reaches external PostgreSQL/JWKS.
        env: {
          DATABASE_URL: this.env.DATABASE_URL,
          JWT_ISSUER: this.env.JWT_ISSUER,
          JWT_AUDIENCE: this.env.JWT_AUDIENCE,
          JWT_JWKS_URL: this.env.JWT_JWKS_URL,
          CORS_ORIGINS: this.env.CORS_ORIGINS ?? "",
          DB_EXPECTED_LOGIN: this.env.DB_EXPECTED_LOGIN,
          APP_ENV: this.env.APP_ENV ?? "production",
        },
      });
    }
    await container.setInactivityTimeout(IDLE_MS);
    const port = container.getTcpPort(PORT);
    for (let attempt = 0; attempt < 80; attempt += 1) {
      try {
        const response = await port.fetch("http://container/healthz", {
          signal: AbortSignal.timeout(1200),
        });
        await response.body?.cancel();
        if (response.ok) {
          await this.ctx.storage.put("container-config-fingerprint", fingerprint);
          this.readyFor = fingerprint;
          return;
        }
      } catch { /* Starting containers may not have a bound port yet. */ }
      await scheduler.wait(250);
    }
    throw new Error("FastAPI Container did not pass readiness on port 8000");
  }
}

export default {
  fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/edge-healthz") {
      return Response.json({status:"up", service:"autonomous-os-edge"});
    }
    // Production does not publish the API schema; keep this at the edge too.
    if (["/docs", "/redoc", "/openapi.json"].includes(path)) {
      return new Response("Not Found", {status:404});
    }
    if (REQUIRED.some(key => !env[key])) {
      return Response.json({detail:"Backend not provisioned"}, {
        status:503, headers:{"cache-control":"no-store"}
      });
    }
    return env.API_CONTAINER.getByName("api-v1").fetch(request);
  },
};
