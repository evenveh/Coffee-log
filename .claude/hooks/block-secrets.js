// PreToolUse hook: blocks Claude from touching secret files/folders.
// Exit code 2 = block the tool call and show stderr to Claude.

const BLOCKED = [
  // .env, .env.local, .env.production, ... but not .env.example
  /(^|[\\/\s"'`=:*])\.env(?!\.example\b)(\.[\w.-]*)?(?=$|[\\/\s"'`;|&)*])/i,
  // secret/, secrets/, .secret/, .secrets/ folders
  /(^|[\\/\s"'`=:*])\.?secrets?(?=[\\/]|$|[\s"'`;|&)*])/i,
];

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const t = input.tool_input || {};
  const candidates = [t.file_path, t.path, t.notebook_path, t.pattern, t.glob, t.command]
    .filter((v) => typeof v === 'string');

  for (const value of candidates) {
    if (BLOCKED.some((re) => re.test(value))) {
      process.stderr.write(
        `Blocked by block-secrets hook: "${value}" refers to a protected secret file or folder. ` +
          'Do not try to read, list, or modify secrets. Ask the user if you need a value from it.\n',
      );
      process.exit(2);
    }
  }
  process.exit(0);
});
