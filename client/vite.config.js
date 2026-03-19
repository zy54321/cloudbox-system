import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import cesium from 'vite-plugin-cesium';

// Cesium 资源/Workers/Widgets 由插件处理
export default defineConfig({
  base: '/yxz/',
  plugins: [vue(), cesium()],
  server: {
    port: 5173
  }
});