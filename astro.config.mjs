import { defineConfig } from 'astro/config';

export default defineConfig({
  // Деплой — GitHub Pages проекта stasjuicytrax-arch/thegarden, поэтому сайт
  // живёт в подпути /thegarden. Если позже подключат свой домен (thegardenstudio.ru) —
  // поменять site на него и убрать base.
  site: 'https://stasjuicytrax-arch.github.io',
  base: '/thegarden',
  trailingSlash: 'never',
  // CSS целиком в HTML: убирает блокирующий запрос стилей на первом экране
  build: { inlineStylesheets: 'always' },
});
