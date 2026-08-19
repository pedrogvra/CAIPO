import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'CAIPO – Plataforma Inteligente de Estudos',
  description: 'Organize seus estudos com o CAIPO, seu assistente inteligente de aprendizado.',
  icons: {
    icon: [
      { url: '/favicon-32x32.png?v=2', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.ico?v=2', type: 'image/x-icon' },
    ],
    apple: '/apple-touch-icon.png?v=2',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col bg-[#0A1A3A] overflow-hidden p-0 md:flex-row md:p-0">
        <AuthProvider>
          <Sidebar />
          <main
            className="app-main flex min-h-screen h-full w-full flex-1 flex-col overflow-x-hidden overflow-y-auto"
          >
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
