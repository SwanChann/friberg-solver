import { z } from 'zod'
import { PLAYER_ROLES, type Player } from '../domain/player'

const difficultySchema = z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{0,31}$/)

export const playerSchema = z.object({
  id: z.number().int().positive().optional(),
  nickname: z.string().trim().min(1).max(64),
  nationality: z.string().trim().min(1).max(64),
  region: z.string().trim().max(32),
  team: z.string().trim().max(64),
  team_history: z.array(z.string().trim().min(1).max(64)).max(50),
  age: z.number().int().min(10).max(100),
  role: z.enum(PLAYER_ROLES),
  major_championships: z.number().int().min(0),
  major_appearances: z.number().int().min(0),
  is_active: z.boolean(),
  is_enabled: z.boolean().optional(),
  difficulties: z.array(difficultySchema).max(20).optional(),
}).strict()

export const sourcePlayerSchema = playerSchema.extend({
  team_history: playerSchema.shape.team_history.optional(),
})

export const playersSchema = z.array(playerSchema).min(1).max(1000)
export const sourcePlayersSchema = z.array(sourcePlayerSchema).min(1).max(1000)

export function formatValidationError(error: z.ZodError): string {
  return error.issues.map((issue) => {
    const path = issue.path.reduce((result, segment) => (
      typeof segment === 'number'
        ? `${result || 'players'}[${segment}]`
        : `${result ? `${result}.` : ''}${segment}`
    ), '') || 'dataset'
    return `${path}: ${issue.message}`
  }).join('\n')
}

function assertUniqueNicknames(players: Player[]): void {
  const seen = new Map<string, number>()
  players.forEach((player, index) => {
    const normalized = player.nickname.toLocaleLowerCase('en-US')
    const previous = seen.get(normalized)
    if (previous !== undefined) {
      throw new Error(`players[${index}].nickname: duplicate of players[${previous}] (${player.nickname})`)
    }
    seen.set(normalized, index)
  })
}

export function validatePlayers(value: unknown): Player[] {
  const result = playersSchema.safeParse(value)
  if (!result.success) throw new Error(formatValidationError(result.error))
  assertUniqueNicknames(result.data)
  return result.data
}

export function normalizeSourcePlayers(value: unknown, current: Player[] = []): Player[] {
  const unwrapped = value && typeof value === 'object' && !Array.isArray(value) && 'players' in value
    ? (value as { players: unknown }).players
    : value
  const result = sourcePlayersSchema.safeParse(unwrapped)
  if (!result.success) throw new Error(formatValidationError(result.error))
  const historyByNickname = new Map(current.map((player) => [player.nickname, player.team_history]))
  const normalized = result.data.map((player) => ({
    ...player,
    team_history: player.team_history ?? historyByNickname.get(player.nickname) ?? [],
  }))
  return validatePlayers(normalized)
}
