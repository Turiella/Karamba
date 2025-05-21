
import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { LocaleProvider } from '@/contexts/LocaleContext'; // Added LocaleProvider import

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Static metadata will be in the default language (Spanish)
// and dynamically updated by LocaleProvider on the client-side.
export const metadata: Metadata = {
  title: 'Karamba!', // Spanish default
  description: 'Obtén resúmenes concisos para cualquier tema.', // Spanish default
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LocaleProvider>
          {children}
          <Toaster />
        </LocaleProvider>
      </body>
    </html>
  );
}
