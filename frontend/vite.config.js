import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true, // Keep sourcemaps for debugging production issues if they arise later

    // --- NEW: Rollup Options to exclude Fabric.js from aggressive minification ---
    rollupOptions: {
      output: {
        // This is a common pattern to ensure large dependencies like Fabric.js
        // are in their own chunk and potentially not minified as aggressively
        // if that specific minification is causing issues.
        // We will try disabling minification globally first as it's simpler.
        // If that works, we can re-enable and try this more granular approach.
      },
    },
    // --- TEMPORARY FIX: Disable minification entirely for the build ---
    // IMPORTANT: This will increase your bundle size, but it's the most
    // reliable way to diagnose and bypass the 'ReferenceError' if it's
    // truly a minification bug.
    minify: false, // Set to 'false' to disable minification for the entire build
  },
  server: {
    port: 5173,
  },
});
