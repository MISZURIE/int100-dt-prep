import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Port 5173 matches auth.site_url in supabase/config.toml for local sign-in.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 5173 },
});
