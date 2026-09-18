import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
const base = process.env.BASE_PATH ?? '/';
export default defineConfig({
  base,
  plugins: [preact()],
  build: {
    cssTarget: 'safari14',
  },
});
