import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

// Generates all app icons from public/logo.svg. Run: npm run generate-icons
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    // Android "maskable" icon: the launcher crops it to a circle/squircle, so it needs
    // padding and a solid background.
    maskable: { ...preset.maskable, resizeOptions: { background: '#22150f' } },
    // iOS home-screen icon: must not be transparent (iOS would fill it with black).
    apple: { ...preset.apple, resizeOptions: { background: '#22150f' } },
  },
  images: ['public/logo.svg'],
})
