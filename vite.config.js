import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [tailwindcss()],

    // In development, send /api requests to the contact form backend
    // (run it with: node api/index.mjs). On the live site nginx does this.
    server: {
        proxy: {
            "/api": "http://localhost:4200",
        },
    },
});
