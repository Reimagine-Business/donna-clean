import { toast } from 'sonner'

export function showSuccess(message: string) {
  return toast.success(message, {
    style: {
      background: '#1a1a2e',
      border: '1px solid rgba(124, 58, 237, 0.5)',
      color: '#ffffff',
    },
    icon: '✅',
  })
}

export function showError(message: string) {
  return toast.error(message, {
    style: {
      background: '#1a1a2e',
      border: '1px solid rgba(239, 68, 68, 0.5)',
      color: '#ffffff',
    },
    icon: '❌',
  })
}

export function showInfo(message: string) {
  return toast.info(message, {
    style: {
      background: '#1a1a2e',
      border: '1px solid rgba(59, 130, 246, 0.5)',
      color: '#ffffff',
    },
    icon: 'ℹ️',
  })
}

export function showWarning(message: string) {
  return toast.warning(message, {
    style: {
      background: '#1a1a2e',
      border: '1px solid rgba(234, 179, 8, 0.5)',
      color: '#ffffff',
    },
    icon: '⚠️',
  })
}
