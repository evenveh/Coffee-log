// TypeScript shapes of our database rows (must match supabase/migrations).
import type { DrinkType } from './drinkTypes'

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
  group_id: string | null // null = private to created_by
  created_at: string
  in_my_list: boolean // false = only readable because one of the brews I can see uses it
}

// The fields a user fills in; the database sets the rest.
export type BeanInput = Pick<Bean, 'roaster' | 'name' | 'origin' | 'process' | 'roast_level' | 'roast_date' | 'notes'>

export type Brew = {
  id: string
  user_id: string
  brewed_at: string // ISO timestamp
  drink_type: DrinkType
  bean_id: string | null
  grinder_id: string | null
  brewer_id: string | null // filter brews only
  grind_setting: number | null
  dose_g: number | null
  yield_g: number | null // espresso: grams out. filter: grams of water.
  time_s: number | null
  water_temp_c: number | null
  milk_id: string | null
  rating_overall: number | null
  sweetness: number | null
  acidity: number | null
  bitterness: number | null
  body: number | null
  latte_art_rating: number | null
  notes: string | null
  created_at: string
}

export type BrewInput = Omit<Brew, 'id' | 'user_id' | 'created_at'>

// A brew plus the related rows Supabase joins in for us (see BREW_SELECT in useBrews).
export type BrewWithRelations = Brew & {
  bean: Pick<Bean, 'id' | 'name' | 'roaster' | 'roast_date' | 'roast_level'> | null
  milk: { name: string } | null
  grinder: { name: string } | null
  brewer: { name: string } | null
  photos: BrewPhoto[]
}

export type BrewPhoto = {
  id: string
  storage_path: string // full-size image; see thumbPath() for the thumbnail
  created_at: string
}

// A group of friends who see each other's brews (see 0002_groups.sql).
export type Group = {
  id: string
  name: string
  invite_code: string
}

export type GroupMember = {
  id: string // user id
  display_name: string | null
}

// Milks, grinders and brewers share this shape (see 0006_group_libraries.sql).
export type NamedTable = 'milks' | 'grinders' | 'brewers'
export type NamedItem = {
  id: string
  name: string
  archived: boolean
  in_my_list: boolean // see Bean
}
