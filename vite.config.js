import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves project sites from /<repo-name>/, so the base path
// must match the repo name for assets to resolve correctly in production.
export default defineConfig({
  plugins: [react()],
  base: "/inflation-reality/",
});
