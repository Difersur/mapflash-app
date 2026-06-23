import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MapFlash — Rutas y servicios del Peru',
  description: 'Navega, entrega y conecta con conductores verificados en Peru. Rutas optimas con Dijkstra y alertas de seguridad.',
  keywords: ['delivery peru', 'rutas lima', 'conductor verificado', 'mapflash', 'envios peru'],
  authors: [{ name: 'MapFlash', url: 'https://mapflash.app' }],
  openGraph: {
    title: 'MapFlash — Rutas y servicios del Peru',
    description: 'Navega, entrega y conecta con conductores verificados en Peru.',
    url: 'https://mapflash.app',
    siteName: 'MapFlash',
    images: [{ url: '/og-image.svg', width: 1200, height: 630 }],
    locale: 'es_PE',
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
  themeColor: '#1a8fe3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
