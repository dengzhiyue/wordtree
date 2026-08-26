import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'icon.svg', 'icon-192.svg', 'icon-512.svg'],
            manifest: {
                name: 'RecurWords · 递归式英文词汇学习',
                short_name: 'RecurWords',
                description: '用英文解释英文，递归理解直至掌握；答错自动入错题库。',
                start_url: '/',
                display: 'standalone',
                orientation: 'portrait-primary',
                background_color: '#ffffff',
                theme_color: '#7c3aed',
                icons: [
                    {
                        src: '/icon-192.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml',
                        purpose: 'any maskable',
                    },
                    {
                        src: '/icon-512.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml',
                        purpose: 'any maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{html,js,css,svg,png,ico,woff2}'],
                runtimeCaching: [],
            },
        }),
    ],
    resolve: {
        alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            '/oxford': {
                target: 'https://od-api.oxforddictionaries.com',
                changeOrigin: true,
                rewrite: function (p) { return p.replace(/^\/oxford/, ''); },
                secure: true,
            },
        },
    },
    preview: {
        host: '0.0.0.0',
        port: 4173,
    },
});
