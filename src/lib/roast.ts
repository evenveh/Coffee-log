import type { RoastLevel } from './types'

// Full class names, written out so Tailwind finds them when it scans the code.
// (A built string like `bg-roast-${level}` would never be generated.)
const ROAST_CLASSES: Record<RoastLevel, string> = {
  light: 'bg-roast-light',
  'medium-light': 'bg-roast-medium-light',
  medium: 'bg-roast-medium',
  'medium-dark': 'bg-roast-medium-dark',
  dark: 'bg-roast-dark',
}

// Background class for a bean's roast level; unknown = hatched pattern (see index.css).
export function roastClass(level: RoastLevel | null | undefined): string {
  return level ? ROAST_CLASSES[level] : 'roast-unknown'
}

// The same colours as SVG fills, for shapes like RoastBean.
const ROAST_FILLS: Record<RoastLevel, string> = {
  light: 'fill-roast-light',
  'medium-light': 'fill-roast-medium-light',
  medium: 'fill-roast-medium',
  'medium-dark': 'fill-roast-medium-dark',
  dark: 'fill-roast-dark',
}

// Fill class for a bean's roast level; unknown = no fill (RoastBean dashes the outline instead).
export function roastFill(level: RoastLevel | null | undefined): string {
  return level ? ROAST_FILLS[level] : 'fill-none'
}
