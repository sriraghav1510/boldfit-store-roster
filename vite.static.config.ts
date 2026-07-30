import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "static-demo",
  base: "/boldfit-store-roster/",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../docs",
    // Preserve any separately named review artifacts already placed in docs.
    emptyOutDir: false,
  },
});
