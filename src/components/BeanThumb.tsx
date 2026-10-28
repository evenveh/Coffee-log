import type { RoastLevel } from '../lib/types'
import RoastSwatch from './RoastSwatch'

// The bag photo with a roast-colour dot in the corner, or just the swatch when there's no photo
// (or its link hasn't loaded yet). The roast colour carries information, so it stays visible.
// Size and shape come from className, as for RoastSwatch.
export default function BeanThumb({ url, level, className = '' }: { url?: string; level: RoastLevel | null | undefined; className?: string }) {
  if (!url) return <RoastSwatch level={level} className={className} />

  return (
    <span className={`relative block shrink-0 ${className}`}>
      <img src={url} alt="" loading="lazy" className="size-full rounded-[inherit] object-cover" />
      {/* The bg-coloured border separates the dot from the photo behind it. */}
      <span className="absolute -right-1 -bottom-1 rounded-full bg-bg p-0.5">
        <RoastSwatch level={level} className="size-3.5 rounded-full" />
      </span>
    </span>
  )
}
