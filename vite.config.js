import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site serves at the root of its custom domain
// (inflation.translatingpolicy.com, set by public/CNAME), so assets resolve
// from "/" rather than the old GitHub Pages /<repo-name>/ project path.
export default defineConfig({
  plugins: [react()],
  base: "/",
});
