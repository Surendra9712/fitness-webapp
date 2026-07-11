// import { fileURLToPath } from 'url'
// import path from 'path'
// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import tailwindcss from '@tailwindcss/vite'

// const __dirname = path.dirname(fileURLToPath(import.meta.url))

// export default defineConfig({
//   plugins: [react(), tailwindcss()],
//   resolve: {
//     alias: { '@': path.resolve(__dirname, 'src') },
//   },
//   server: {
//     proxy: {
//       '/api':    { target: 'http://localhost:5000', changeOrigin: true },
//       '/static': { target: 'http://localhost:5000', changeOrigin: true },
//     },
//   },
// })

import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// getUserMedia (the trainer/client calling feature) only runs in a secure
// context — HTTPS, or the browser's special-cased localhost/127.0.0.1.
// Without a cert, opening the app from another device via the host's LAN IP
// serves plain HTTP and silently breaks calling. Run `npm run certs:generate`
// once (and again if your LAN IP changes) to create these.
const certDir = path.resolve(__dirname, ".certs");
const keyPath = path.join(certDir, "dev-key.pem");
const certPath = path.join(certDir, "dev-cert.pem");
const https =
  fs.existsSync(keyPath) && fs.existsSync(certPath)
    ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
    : undefined;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0", // <-- Add this
    port: 5175, // Optional, if you want to use 5175
    https,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/static": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      // Chat + calling signaling. Proxied the same way as /api so the
      // socket always connects same-origin (works from any device/hostname
      // that loaded the page, over HTTP or HTTPS) instead of hardcoding a
      // backend URL the client dials directly.
      "/socket.io": {
        target: "http://localhost:5000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
