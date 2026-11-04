import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// 프로젝트 페이지로 배포할 때만 BASE_PATH=/esp32-div2 를 준다.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'ignore',
  integrations: [react()],
  devToolbar: { enabled: false },
});
