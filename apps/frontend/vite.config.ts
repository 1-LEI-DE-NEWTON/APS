import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function getBackendPortFromEnvFile(): string | null {
  const backendEnvPath = path.resolve(process.cwd(), '../backend/.env');
  if (!fs.existsSync(backendEnvPath)) return null;

  const envContent = fs.readFileSync(backendEnvPath, 'utf8');
  const match = envContent.match(/^\s*PORT\s*=\s*(\d+)\s*$/m);
  return match?.[1] ?? null;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendPort = getBackendPortFromEnvFile() ?? '3000';
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || `http://localhost:${backendPort}`;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      outDir: 'dist',
    },
  };
});
