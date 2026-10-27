import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'

// How long saved data is kept on the device. Older saves are thrown away on launch.
const MAX_AGE_MS = 24 * 60 * 60 * 1000

// Holds the cache for all server data (brews, beans, ...) fetched with React Query.
// gcTime must be at least MAX_AGE_MS: unused queries are dropped from memory after gcTime,
// and dropped queries aren't saved, so with the 5 min default little would survive.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: MAX_AGE_MS } },
})

// Saves the cache to localStorage (at most once a second), so the app shows your
// last data instantly on launch and refreshes it in the background.
export const persister = createSyncStoragePersister({ storage: window.localStorage })

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: MAX_AGE_MS,
  dehydrateOptions: {
    // Signed photo URLs expire after an hour, so a saved one may already be dead.
    shouldDehydrateQuery: (query) => defaultShouldDehydrateQuery(query) && query.queryKey[0] !== 'signed-urls',
  },
}
