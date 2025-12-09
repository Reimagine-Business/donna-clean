'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      theme="dark"
      toastOptions={{
        style: {
          background: '#1a1a2e',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          color: '#ffffff',
        },
        className: 'toast-custom',
        duration: 4000,
      }}
    />
  )
}
