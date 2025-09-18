'use client'

import { Preview as PreviewComponent } from '@/components/preview/preview'

interface Props {
  className?: string
}

export function Preview({ className }: Props) {
  return (
    <PreviewComponent
      className={className}
      disabled={false}
      url="http://localhost:3000"
    />
  )
}
