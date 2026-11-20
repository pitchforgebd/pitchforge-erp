import type { MetadataRoute } from 'next';

/**
 * The installable app (UX-01). There is deliberately no service worker: financial and personal
 * data is never cached on the device, so the app needs a connection, like the web version.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pitchforge ERP',
    short_name: 'Pitchforge',
    description: 'Sales, projects, accounting, HR and payroll for Pitchforge.',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    background_color: '#f3f5f3',
    theme_color: '#0b6e66',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
    shortcuts: [
      { name: 'Check in', short_name: 'Check in', url: '/hr' },
      { name: 'Request leave', short_name: 'Leave', url: '/hr' },
      { name: 'Approvals', short_name: 'Approvals', url: '/approvals' },
      { name: 'Expense claims', short_name: 'Claims', url: '/finance' },
    ],
  };
}
