import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '研究室チェックイン',
    short_name: 'チェックイン',
    description: '研究室の出欠とタスク管理を行うダッシュボード',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f5f7',
    theme_color: '#f5f5f7',
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
    // アイコン長押しで表示されるショートカット（Android / デスクトップ Chrome 対応）
    shortcuts: [
      {
        name: '出勤（チェックイン）',
        short_name: '出勤',
        url: '/dashboard/overview?action=checkin',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      {
        name: '退勤を記録',
        short_name: '退勤',
        url: '/dashboard/overview?action=checkout',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
    ],
  };
}
