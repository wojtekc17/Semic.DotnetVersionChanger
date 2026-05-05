import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, "webview"),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "dist", "webview"),
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, "webview", "index.html"),
      output: {
        entryFileNames: "assets/App.js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "assets/App.css";
          }

          return "assets/[name][extname]";
        }
      }
    }
  }
});
