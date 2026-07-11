import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

// getUserMedia (needed for the trainer/client audio+video calling feature)
// only works in a "secure context" — HTTPS, or the browser's special-cased
// localhost/127.0.0.1. Opening the app from another device via the host's
// LAN IP over plain HTTP silently breaks calling with no usable error. This
// generates a self-signed cert covering localhost plus every LAN IP
// currently assigned to this machine, so `vite --host` can serve HTTPS and
// calling works when testing from other devices too.

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".certs");
mkdirSync(dir, { recursive: true });

const lanIps = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net && net.family === "IPv4" && !net.internal)
  .map((net) => net.address);

const altNames = [
  "DNS:localhost",
  "IP:127.0.0.1",
  "IP:::1",
  ...lanIps.map((ip) => `IP:${ip}`),
].join(",");

const configPath = path.join(dir, "openssl.cnf");
writeFileSync(
  configPath,
  `[req]\ndistinguished_name=req\n[san]\nsubjectAltName=${altNames}\n`,
);

const keyPath = path.join(dir, "dev-key.pem");
const certPath = path.join(dir, "dev-cert.pem");

execFileSync("openssl", [
  "req",
  "-x509",
  "-newkey", "rsa:2048",
  "-sha256",
  "-days", "825",
  "-nodes",
  "-keyout", keyPath,
  "-out", certPath,
  "-subj", "/CN=smartdiet-dev",
  "-extensions", "san",
  "-config", configPath,
]);

console.log(`Dev cert written to ${certPath}`);
console.log(`Covers: localhost, 127.0.0.1${lanIps.length ? ", " + lanIps.join(", ") : ""}`);
console.log("Re-run this script if your LAN IP changes (e.g. new network).");
