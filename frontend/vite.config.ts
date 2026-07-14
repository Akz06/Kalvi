import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Raise the warning threshold — @react-pdf/renderer is intentionally heavy
    // (it bundles a PDF renderer + fonts). We split it into its own chunk so
    // it doesn't block the initial page load.
    // @react-pdf/renderer bundles a full PDF engine — ~1.3 MB minified is expected.
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — always needed
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // PDF renderer — lazy-load friendly, large but only used on demand
          "vendor-pdf": ["@react-pdf/renderer"],
        },
      },
    },
  },
});
