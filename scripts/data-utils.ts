import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Player } from '../src/domain/player'
import { normalizeSourcePlayers, validatePlayers } from '../src/data/playerSchema'

export function readPlayers(path: string, allowSourceShape = false, current: Player[] = []): Player[] {
  const absolute = resolve(path)
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(absolute, 'utf8')) as unknown
  } catch (cause) {
    throw new Error(`${absolute}: ${cause instanceof Error ? cause.message : 'invalid JSON'}`)
  }
  const raw = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'players' in parsed
    ? (parsed as { players: unknown }).players
    : parsed
  return allowSourceShape ? normalizeSourcePlayers(raw, current) : validatePlayers(raw)
}

export function stableJson(players: Player[]): string {
  return `${JSON.stringify(players, null, 2)}\n`
}

export function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

export interface DatasetDiff {
  added: Player[]
  removed: Player[]
  changed: Array<{ before: Player; after: Player; fields: string[] }>
}

export function diffPlayers(before: Player[], after: Player[]): DatasetDiff {
  const beforeMap = new Map(before.map((player) => [player.nickname, player]))
  const afterMap = new Map(after.map((player) => [player.nickname, player]))
  const added = after.filter((player) => !beforeMap.has(player.nickname))
  const removed = before.filter((player) => !afterMap.has(player.nickname))
  const changed: DatasetDiff['changed'] = []
  for (const next of after) {
    const previous = beforeMap.get(next.nickname)
    if (!previous) continue
    const fields = [...new Set([...Object.keys(previous), ...Object.keys(next)])].filter((field) => (
      JSON.stringify(previous[field as keyof Player]) !== JSON.stringify(next[field as keyof Player])
    ))
    if (fields.length) changed.push({ before: previous, after: next, fields })
  }
  return { added, removed, changed }
}

function line(value: unknown): string {
  return Array.isArray(value) ? JSON.stringify(value) : String(value)
}

export function formatDiff(before: Player[], after: Player[]): string {
  const diff = diffPlayers(before, after)
  const output = [`Players: ${before.length} -> ${after.length}`, '']
  output.push('Added:')
  output.push(...(diff.added.length ? diff.added.map((player) => `+ ${player.nickname}`) : ['(none)']))
  output.push('', 'Removed:')
  output.push(...(diff.removed.length ? diff.removed.map((player) => `- ${player.nickname}`) : ['(none)']))
  output.push('', 'Changed:')
  if (!diff.changed.length) output.push('(none)')
  for (const change of diff.changed) {
    output.push('', change.after.nickname)
    for (const field of change.fields) {
      const previous = change.before[field as keyof Player]
      const next = change.after[field as keyof Player]
      if (field === 'team_history' && Array.isArray(previous) && Array.isArray(next)) {
        const addedTeams = next.filter((team) => !previous.includes(team))
        const removedTeams = previous.filter((team) => !next.includes(team))
        output.push(`  ${field}:`)
        output.push(...addedTeams.map((team) => `    + ${team}`), ...removedTeams.map((team) => `    - ${team}`))
      } else {
        output.push(`  ${field}:`)
        output.push(`    ${line(previous)} -> ${line(next)}`)
      }
    }
  }
  return output.join('\n')
}
