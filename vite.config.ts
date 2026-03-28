import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      entities: path.resolve(__dirname, "src/entities/"),
      widgets: path.resolve(__dirname, "src/widgets/"),
      features: path.resolve(__dirname, "src/features/"),
      pages: path.resolve(__dirname, "src/pages/"),
      shared: path.resolve(__dirname, "src/shared/"),
    },
  },
});
