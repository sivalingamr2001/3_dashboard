import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { env } from "process";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const isAnalyze = mode === "analyze";

  return {
    base: "/mobile_dashboard/",
    server: {
      port: 3000,
    },
    define: {
      __APP_URL__: JSON.stringify(env.VITE_APP_URL),
    },
    plugins: [
      react(),
      tsconfigPaths(),
      tailwindcss(),
      isAnalyze &&
        visualizer({
          open: true,
          gzipSize: true,
          brotliSize: true,
          filename: "dist/bundle-analysis.html",
        }),
    ].filter(Boolean),
    build: {
      chunkSizeWarningLimit: 1200, // Adjusted to safely accommodate the isolated ag-grid asset
      cssCodeSplit: true,
      sourcemap: false,
      minify: "esbuild",
      rollupOptions: {
        output: {
          chunkFileNames: "assets/js/[name]-[hash].js",
          entryFileNames: "assets/js/[name]-[hash].js",
          assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
          
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            // 1. Isolate the heavy ag-grid data engine
            if (id.includes("ag-grid")) {
              return "data-grid";
            }

            // 2. Isolate core routing libraries 
            if (id.includes("react-router") || id.includes("@remix-run")) {
              return "router";
            }

            // 3. Keep UI component primitives separate 
            if (id.includes("@radix-ui")) {
              return "ui";
            }

            // Let React, React-DOM, and standard utilities safely bundle together 
            // inside the fallback 'vendor' chunk to prevent circular dependency graphs.
            return "vendor";
          },
        },
      },
    },
  };
});
