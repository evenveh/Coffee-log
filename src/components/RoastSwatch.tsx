import { roastClass } from '../lib/roast'
import type { RoastLevel } from '../lib/types'

// A block of the bean's roast colour. Size and shape come from className.
// The faint inner ring keeps a dark roast visible on the dark theme.
export default function RoastSwatch({ level, className = '' }: { level: RoastLevel | null | undefined; className?: string }) {
  return (
    <span
      aria-hidden
      title={level ? `${level} roast` : 'Roast level unknown'}
      className={`block shrink-0 ring-1 ring-black/10 ring-inset dark:ring-white/20 ${roastClass(level)} ${className}`}
    />
  )
}
