import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
    server: {
        host: true,
        port: 8080,
        allowedHosts: [
            "desktop-efbo5bl.tail05cf33.ts.net",
            ".tail05cf33.ts.net",  // This allows any subdomain
            ".ts.net",  // Or even more permissive
        ],
    },
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
                    'utils': ['clsx', 'tailwind-merge'],
                }
            }
        },
        // Optional: increase the warning limit if you're okay with larger chunks
        chunkSizeWarningLimit: 1000,
    },
}));