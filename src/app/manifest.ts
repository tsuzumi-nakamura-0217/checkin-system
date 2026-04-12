import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '研究室チェックイン',
    short_name: 'チェックイン',
    description: '研究室の出欠とタスク管理を行うダッシュボード',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a', /* slate-900 */
    icons: [
      {
        src: '/icon.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
