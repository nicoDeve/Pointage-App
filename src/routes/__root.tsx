/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { TooltipProvider } from '~/components/ui/tooltip'
import { ThemeProvider } from '~/lib/theme'
import { AuthProvider } from '~/contexts/auth-provider'
import appCss from '~/globals.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Holis Pointage' },
    ],
    links: [
      // Geist font (Vercel) via jsDelivr CDN — used as --font-sans / --font-mono
      {
        rel: 'preload',
        href: 'https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-sans/Geist-Variable.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: 'https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-mono/GeistMono-Variable.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <ThemeProvider>
        <TooltipProvider delayDuration={200}>
          <AuthProvider>
            <Outlet />
            <Toaster position="top-right" richColors closeButton />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
