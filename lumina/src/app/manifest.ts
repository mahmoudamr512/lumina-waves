import type { MetadataRoute } from 'next'

// Next.js 16 serves this at /manifest.webmanifest and auto-links it in <head>.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lumina Waves Ops',
    short_name: 'Lumina',
    description: 'نظام إدارة عمليات لومينا ويفز — العملاء والعقود والإصدارات والمصنفات.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0D',
    theme_color: '#0A0A0D',
    dir: 'rtl',
    lang: 'ar',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
