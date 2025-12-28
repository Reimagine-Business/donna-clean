import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DonnaIconProps {
  icon: LucideIcon
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'success' | 'danger' | 'warning'
  className?: string
  iconClassName?: string
}

const sizeConfig = {
  xs: {
    container: 'w-6 h-6',
    icon: 'w-3 h-3',
  },
  sm: {
    container: 'w-8 h-8',
    icon: 'w-4 h-4',
  },
  md: {
    container: 'w-10 h-10',
    icon: 'w-5 h-5',
  },
  lg: {
    container: 'w-12 h-12',
    icon: 'w-6 h-6',
  },
  xl: {
    container: 'w-14 h-14',
    icon: 'w-7 h-7',
  },
}

const variantConfig = {
  default: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: 'text-zinc-300',
  },
  success: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: 'text-green-300',
  },
  danger: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-300',
  },
  warning: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: 'text-yellow-300',
  },
}

export function DonnaIcon({
  icon: Icon,
  size = 'md',
  variant = 'default',
  className,
  iconClassName
}: DonnaIconProps) {
  const { container, icon } = sizeConfig[size]
  const colors = variantConfig[variant]

  return (
    <div
      className={cn(
        // Circular container with faint purple background
        'rounded-full',
        'flex items-center justify-center',
        'shrink-0',
        'border',
        container,
        colors.bg,
        colors.border,
        className
      )}
    >
      <Icon
        className={cn(
          // Light lavender/zinc icon color
          icon,
          colors.icon,
          iconClassName
        )}
        strokeWidth={1.5}
      />
    </div>
  )
}

// Export for easy importing
export default DonnaIcon
