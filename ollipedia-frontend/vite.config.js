import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  publicDir: "public",
  build: {
    // Output the build into ../dist  (one level up, next to server.js)
    // So server.js can find it with: path.join(__dirname, "dist")
    outDir: "../dist",
    emptyOutDir: true,
  },
});