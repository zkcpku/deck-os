import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Toaster } from '@/components/ui/sonner'
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'

const title = 'OSS Vibe Coding Platform'
const description = `This is a demo of an end-to-end coding platform where the user can enter text prompts, and the agent will create a full stack application. It uses Vercel's AI Cloud services like Sandbox for secure code execution, AI Gateway for GPT-5 and other models support, Fluid Compute for efficient rendering and streaming, and it's built with Next.js and the AI SDK.`

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    images: [
      {
        url: 'https://assets.vercel.com/image/upload/v1754588799/OSSvibecodingplatform/OG.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: 'https://assets.vercel.com/image/upload/v1754588799/OSSvibecodingplatform/OG.png',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Suspense fallback={null}>
          <NuqsAdapter>
            {children}
          </NuqsAdapter>
        </Suspense>
        <Toaster />
      </body>
    </html>
  )
}
