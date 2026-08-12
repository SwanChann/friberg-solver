import { formatDiff, readPlayers } from './data-utils'

const beforePath = process.argv[2] ?? 'data-snapshots/bootstrap-2026-07-27.json'
const afterPath = process.argv[3] ?? 'data/players.json'

try {
  const before = readPlayers(beforePath)
  const after = readPlayers(afterPath)
  console.log(formatDiff(before, after))
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : cause)
  process.exitCode = 1
}
