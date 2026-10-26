// The single source of truth for drink types. Must match the drink_type enum in the database.
// milk: shows the milk + latte art fields. category: changes some labels (yield vs. water).

export type DrinkType =
  | 'espresso' | 'ristretto' | 'lungo' | 'americano'
  | 'cortado' | 'cappuccino' | 'flat_white' | 'latte'
  | 'pour_over' | 'filter_machine' | 'aeropress' | 'french_press' | 'other'

type DrinkInfo = {
  value: DrinkType
  label: string
  category: 'espresso' | 'filter'
  milk: boolean
}

export const DRINK_TYPES: DrinkInfo[] = [
  { value: 'espresso', label: 'Espresso', category: 'espresso', milk: false },
  { value: 'ristretto', label: 'Ristretto', category: 'espresso', milk: false },
  { value: 'lungo', label: 'Lungo', category: 'espresso', milk: false },
  { value: 'americano', label: 'Americano', category: 'espresso', milk: false },
  { value: 'cortado', label: 'Cortado', category: 'espresso', milk: true },
  { value: 'cappuccino', label: 'Cappuccino', category: 'espresso', milk: true },
  { value: 'flat_white', label: 'Flat white', category: 'espresso', milk: true },
  { value: 'latte', label: 'Latte', category: 'espresso', milk: true },
  { value: 'pour_over', label: 'Pour over', category: 'filter', milk: false },
  { value: 'filter_machine', label: 'Filter machine', category: 'filter', milk: false },
  { value: 'aeropress', label: 'AeroPress', category: 'filter', milk: false },
  { value: 'french_press', label: 'French press', category: 'filter', milk: false },
  { value: 'other', label: 'Other', category: 'espresso', milk: false },
]

export function drinkInfo(type: DrinkType): DrinkInfo {
  return DRINK_TYPES.find((d) => d.value === type) ?? DRINK_TYPES[0]
}
