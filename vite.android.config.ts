import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "static-demo",
  base: "./",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../android-web",
    emptyOutDir: true,
  },
});
