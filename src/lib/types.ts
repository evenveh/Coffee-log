// TypeScript shapes of our database rows (must match supabase/migrations).

export const ROAST_LEVELS = ['light', 'medium-light', 'medium', 'medium-dark', 'dark'] as const
export type RoastLevel = (typeof ROAST_LEVELS)[number] // 'light' | 'medium-light' | ...

export type Bean = {
  id: string
  roaster: string | null
  name: string
  origin: string | null
  process: string | null
  roast_level: RoastLevel | null
  roast_date: string | null // 'YYYY-MM-DD'
  notes: string | null
  archived: boolean
  created_by: string | null
  created_at: string
}

// The fields a user fills in; the database sets the rest.
export type BeanInput = Pick<Bean, 'roaster' | 'name' | 'origin' | 'process' | 'roast_level' | 'roast_date' | 'notes'>

// Milks and grinders share this shape.
export type NamedTable = 'milks' | 'grinders'
export type NamedItem = {
  id: string
  name: string
  archived: boolean
}
