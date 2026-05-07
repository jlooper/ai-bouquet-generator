/**
 * Verifies RESEND_API_KEY from .dev.vars by calling Resend (no Worker involved).
 * Run from workers/send-ecard:  npm run verify-resend
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerRoot = path.join(__dirname, "..");
const devVarsPath = path.join(workerRoot, ".dev.vars");

function parseDevVars(content) {
  const out = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    const hash = val.indexOf(" #");
    if (hash !== -1) val = val.slice(0, hash).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1).trim();
    }
    let k = val.replace(/\r$/, "").trim();
    if (k.toLowerCase().startsWith("bearer ")) k = k.slice(7).trim();
    out[key] = k;
  }
  return out;
}

if (!fs.existsSync(devVarsPath)) {
  console.error("Missing file:", devVarsPath);
  console.error("Create it from .dev.vars.example and add RESEND_API_KEY=re_...");
  process.exit(1);
}

const vars = parseDevVars(fs.readFileSync(devVarsPath, "utf8"));
const key = vars.RESEND_API_KEY || "";

if (!key) {
  console.error("No RESEND_API_KEY= line found in .dev.vars");
  process.exit(1);
}

if (!key.startsWith("re_")) {
  console.error("Key should start with re_ (got prefix:", JSON.stringify(key.slice(0, 8)), ")");
  process.exit(1);
}

const res = await fetch("https://api.resend.com/api-keys", {
  headers: { Authorization: `Bearer ${key}` },
});
const body = await res.text();

if (res.ok) {
  console.log("OK — Resend accepted this API key.");
  process.exit(0);
}

// Send-only keys are valid for POST /emails but cannot list API keys (401).
let parsed = null;
try {
  parsed = JSON.parse(body);
} catch {
  /* ignore */
}
if (res.status === 401 && parsed?.name === "restricted_api_key") {
  console.log(
    "OK — This is a send-only (restricted) API key. Resend rejects listing keys, but the Worker can still send mail with it."
  );
  process.exit(0);
}

console.error("Resend returned", res.status);
console.error(body);
console.error(
  "\nFix: new key at https://resend.com/api-keys — one line in .dev.vars: RESEND_API_KEY=re_... (no spaces around =, no quotes, no comment on same line)."
);
process.exit(1);
