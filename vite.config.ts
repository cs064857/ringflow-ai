import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { setupDevApi } from "./server-helper.mjs";

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: "dev-api-middleware",
      configureServer(server) {
        setupDevApi(server);
      }
    }
  ],
  server: {
    port: 3005,
    host: true,
  },
  build: {
    target: "esnext",
    outDir: "dist",
  },
});
