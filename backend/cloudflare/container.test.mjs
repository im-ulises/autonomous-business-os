import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const worker = readFileSync(new URL("./index.js", import.meta.url), "utf8");
test("Cloudflare durable_object runtime uses valid instance size", () => {
  assert.match(worker, /instance:\s*"standard-1"/);
  assert.doesNotMatch(worker, /instance:\s*"basic"/);
});
test("image changes trigger replacement and warm requests avoid health probing", () => {
  assert.match(worker, /container\.inspect\(\)/);
  assert.match(worker, /container\.destroy\(/);
  assert.match(worker, /this\.readyFor === fingerprint/);
  assert.match(worker, /container-config-fingerprint/);
});
