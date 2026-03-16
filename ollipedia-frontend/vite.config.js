import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  publicDir: "public",
  build: {
    outDir: "dist",   // Output inside the frontend folder — Render Static Site expects this
    emptyOutDir: true,
  },
});