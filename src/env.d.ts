/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// Исходники со старого сайта (assets/old-site/) иногда имеют расширение в
// верхнем регистре — Astro типизирует только нижний регистр (node_modules/astro/client.d.ts).
declare module '*.JPG' {
  const metadata: import('astro').ImageMetadata;
  export default metadata;
}
declare module '*.PNG' {
  const metadata: import('astro').ImageMetadata;
  export default metadata;
}
declare module '*.JPEG' {
  const metadata: import('astro').ImageMetadata;
  export default metadata;
}
