import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  // Build a define object that replaces process.env.KEY with the stringified value
  const define: Record<string, string> = {
    'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
    'process.env.NODE_ENV': JSON.stringify(mode),
  };

  // Dynamically add all FIREBASE_ keys
  Object.keys(env).forEach(key => {
    if (key.startsWith('FIREBASE_')) {
      define[`process.env.${key}`] = JSON.stringify(env[key] || '');
    }
  });
  
  return {
    plugins: [react()],
    define: define
  };
});