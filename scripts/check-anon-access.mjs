// Checks that a visitor who is NOT signed in can't read or write anything.
// Run with:  node --env-file=.env.local scripts/check-anon-access.mjs
// Uses only the public key, exactly like a stranger opening the app would.

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Missing env vars. Did you pass --env-file=.env.local?')
  process.exit(1)
}

const headers = { apikey: key, 'Content-Type': 'application/json' }
let allBlocked = true

function report(label, status, body) {
  // Blocked = an error status, or a successful but empty result.
  const blocked = status >= 400 || body.trim() === '[]'
  if (!blocked) allBlocked = false
  console.log(`${blocked ? 'OK  ' : 'LEAK'}  ${label.padEnd(22)} ${status}  ${body.slice(0, 70)}`)
}

for (const table of ['profiles', 'beans', 'milks', 'grinders', 'brewers', 'brews', 'brew_photos', 'groups', 'group_members']) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers })
  report(`read ${table}`, res.status, await res.text())
}

const insert = await fetch(`${url}/rest/v1/beans`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ name: 'anonymous test bean' }),
})
report('insert bean', insert.status, await insert.text())

const join = await fetch(`${url}/rest/v1/rpc/join_group`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ code: 'test' }),
})
report('join group', join.status, await join.text())

const list = await fetch(`${url}/storage/v1/object/list/brew-photos`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ prefix: '' }),
})
report('list photos', list.status, await list.text())

console.log(allBlocked ? '\nAll good: anonymous visitors are locked out.' : '\nWARNING: something is readable without signing in!')
