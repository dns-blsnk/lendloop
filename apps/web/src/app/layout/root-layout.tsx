import { ClerkProvider } from '@clerk/nextjs';
import { Geist, Geist_Mono } from 'next/font/google';

import { EnsureViewer } from '@/features/auth';
import { publicEnv } from '@/shared/config';

import { ConvexClientProvider } from '../session/convex-provider';

import '../styles/globals.css';

import type { ReactNode } from 'react';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ClerkProvider publishableKey={publicEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
          <ConvexClientProvider>
            <EnsureViewer />
            {children}
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
