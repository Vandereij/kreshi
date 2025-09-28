// Allow Astro.resolve() in .astro frontmatter without TS errors
declare const Astro: import('astro').AstroGlobal & {
  resolve: (path: string) => string;
};