import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function manualChunks(id) {
  const normalized = id.replace(/\\/g, "/");
  if (
    normalized.includes("/node_modules/react/") ||
    normalized.includes("/node_modules/react-dom/") ||
    normalized.includes("/node_modules/scheduler/")
  ) {
    return "vendor-react";
  }
  if (normalized.includes("/node_modules/d3-")) {
    return "vendor-d3";
  }
  if (normalized.includes("/node_modules/@phosphor-icons/react/")) {
    return "vendor-icons";
  }
  if (
    normalized.includes("/src/heroes/") ||
    normalized.includes("/src/HeroEmblems.jsx")
  ) {
    return "scenes-heroes";
  }
  if (
    normalized.includes("/src/ProcessGraphic.jsx") ||
    normalized.includes("/src/StorySymbols.jsx")
  ) {
    return "scenes-graphics";
  }
  if (
    normalized.includes("/src/storyboards/catalog.js") ||
    normalized.includes("/src/storyboards/places.js") ||
    normalized.includes("/src/storyboards/prc-places.js") ||
    normalized.includes("/src/stories.js") ||
    normalized.includes("/src/narration.js")
  ) {
    return "storyboards-modern";
  }
  return undefined;
}

export default defineConfig({
  base: "./",
  esbuild: {
    drop: ["debugger"],
  },
  build: {
    outDir: "dist/client",
    target: "es2020",
    minify: "esbuild",
    cssMinify: "esbuild",
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react()],
});
