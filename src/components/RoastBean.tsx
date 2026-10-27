import { roastFill } from '../lib/roast'
import type { RoastLevel } from '../lib/types'

// A coffee bean in the roast colour. Size comes from className.
// The outline uses currentColor (the surrounding text colour), so it contrasts with whatever
// the bean sits on, including a selected chip. Unknown roast = empty bean with a dashed outline.
export default function RoastBean({ level, className = '' }: { level: RoastLevel | null | undefined; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeDasharray={level ? undefined : '2.5 2'}
    >
      <title>{level ? `${level} roast` : 'Roast level unknown'}</title>
      {/* Drawn upright, then tilted like a bean lying on the counter. */}
      <g transform="rotate(30 12 12)">
        <ellipse cx="12" cy="12" rx="7" ry="10" className={roastFill(level)} strokeOpacity={0.5} />
        {/* The crease: an S-curve down the long axis. */}
        <path d="M12 3 C9 8 15 16 12 21" strokeOpacity={level ? 0.7 : 0.5} />
      </g>
    </svg>
  )
}
