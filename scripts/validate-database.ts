import { resolve } from 'node:path'
import { readPlayers } from './data-utils'

const path = process.argv[2] ?? 'data/players.json'

try {
  const players = readPlayers(path)
  const emptyRegions = players.filter((player) => !player.region).length
  const histories = players.filter((player) => player.team_history.length > 0).length
  const disabled = players.filter((player) => player.is_enabled === false).length
  const grouped = players.reduce<Record<string, number>>((counts, player) => {
    counts[player.role] = (counts[player.role] ?? 0) + 1
    return counts
  }, {})
  const roles = Object.entries(grouped)
    .map(([role, count]) => `${role}=${count}`)
    .join(', ')
  console.log(`Valid: ${resolve(path)}`)
  console.log(`Players: ${players.length}`)
  console.log(`Roles: ${roles}`)
  console.log(`Non-empty team histories: ${histories}`)
  console.log(`Empty regions: ${emptyRegions}`)
  console.log(`Disabled: ${disabled}`)
  if (emptyRegions) throw new Error(`${emptyRegions} players have an empty region`)
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : cause)
  process.exitCode = 1
}
