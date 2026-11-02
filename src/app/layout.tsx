import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Syne, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'In Frame — Photo Booth',
  description:
    'In Frame Photo Booth with real-time frame selection, interactive sticker studio, high-res PNG export and automated email delivery.',
  icons: {
    icon: '/LOGO.png',
    shortcut: '/LOGO.png',
    apple: '/LOGO.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${syne.variable} ${jetbrains.variable}`}>
      <body className="bg-theater-dark text-cinema-cream min-h-screen antialiased bg-grain selection:bg-cinema-red selection:text-white">
        {children}
      </body>
    </html>
  );
}

