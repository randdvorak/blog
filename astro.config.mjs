import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://randdvorak.github.io',
  base: '/blog',
  output: 'static',
  markdown: {
    shikiConfig: {
      theme: 'github-dark'
    }
  }
});
