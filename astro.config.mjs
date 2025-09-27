import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'
import netlify from '@astrojs/netlify/functions'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [tailwind({ applyBaseStyles: true })],
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
})
