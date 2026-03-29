import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Norway Job Market Visualizer',
  description: 'AI Exposure and Adoption Analysis for the Norwegian labour market (STYRK-08)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nb" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-200 antialiased`}>
        {children}
      </body>
    </html>
  );
}


