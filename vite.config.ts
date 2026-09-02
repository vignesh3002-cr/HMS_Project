import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
 
export default defineConfig({
  plugins: [react()],
 
  build: {
    outDir: "dist",
  },
 
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./client"),
      "@shared": path.resolve(import.meta.dirname, "./shared"),
    },
  },
 
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
});
 