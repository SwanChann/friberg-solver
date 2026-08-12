import type { Player } from '../domain/player'
import type { NicknameCandidate } from './types'

export function normalizeOcrNickname(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\([^)]*\)|（[^）]*）/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLocaleLowerCase()
}

export function levenshteinDistance(left: string, right: string): number {
  if (!left.length) return right.length
  if (!right.length) return left.length
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  const current = new Array<number>(right.length + 1)

  for (let row = 1; row <= left.length; row += 1) {
    current[0] = row
    for (let column = 1; column <= right.length; column += 1) {
      const substitution = previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1)
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        substitution,
      )
    }
    for (let column = 0; column <= right.length; column += 1) previous[column] = current[column]
  }
  return previous[right.length]
}

function similarity(raw: string, nickname: string): number {
  const cleanedRaw = raw.trim()
  const cleanedNickname = nickname.trim()
  if (cleanedRaw === cleanedNickname) return 1
  if (cleanedRaw.toLocaleLowerCase() === cleanedNickname.toLocaleLowerCase()) return 0.99
  const normalizedRaw = normalizeOcrNickname(raw)
  const normalizedNickname = normalizeOcrNickname(nickname)
  if (!normalizedRaw || !normalizedNickname) return 0
  if (normalizedRaw === normalizedNickname) return 0.88
  if (normalizedRaw.startsWith(normalizedNickname) || normalizedNickname.startsWith(normalizedRaw)) {
    return Math.max(0.72, Math.min(normalizedRaw.length, normalizedNickname.length) / Math.max(normalizedRaw.length, normalizedNickname.length))
  }
  const distance = levenshteinDistance(normalizedRaw, normalizedNickname)
  return Math.max(0, 1 - distance / Math.max(normalizedRaw.length, normalizedNickname.length))
}

export function rankNicknameMatches(raw: string, players: Player[], limit = 3): NicknameCandidate[] {
  return players
    .map((player) => ({ nickname: player.nickname, score: similarity(raw, player.nickname) }))
    .sort((left, right) => right.score - left.score || left.nickname.localeCompare(right.nickname))
    .slice(0, limit)
}

export function chooseNicknameMatch(raw: string, players: Player[]): {
  playerNickname: string
  confidence: number
  alternatives: NicknameCandidate[]
} {
  const alternatives = rankNicknameMatches(raw, players)
  const best = alternatives[0]
  const runnerUp = alternatives[1]
  const isReliable = Boolean(best) && best.score >= 0.88 && (!runnerUp || best.score - runnerUp.score >= 0.12)
  return {
    playerNickname: isReliable ? best.nickname : '',
    confidence: best?.score ?? 0,
    alternatives,
  }
}

export interface NumericPlayerSignature {
  age?: number
  major_championships?: number
  major_appearances?: number
}

export function parseNumericOcr(raw: string): number | undefined {
  const compact = raw.replace(/\s/g, '')
  if (!compact) return undefined
  const normalized = compact
    .replace(/[oO]/g, '0')
    .replace(/[iIlL|]/g, '1')
    .replace(/[zZ]/g, '2')
    .replace(/[sS]/g, '5')
    .replace(/[bB]/g, '8')
    .replace(/[gq]/g, '9')
  if (!/^\d+$/.test(normalized)) return undefined
  const value = Number(normalized)
  return Number.isSafeInteger(value) ? value : undefined
}

export function disambiguateNicknameByNumbers(
  raw: string,
  players: Player[],
  signature: NumericPlayerSignature,
): Player | null {
  const normalizedRaw = normalizeOcrNickname(raw)
  const candidates = players.filter((player) => normalizeOcrNickname(player.nickname) === normalizedRaw)
  const known = (Object.entries(signature) as Array<[keyof NumericPlayerSignature, number | undefined]>)
    .filter((entry): entry is [keyof NumericPlayerSignature, number] => entry[1] !== undefined)
  if (candidates.length < 2 || known.length < 2) return null
  const exactMatches = candidates.filter((player) => known.every(([field, value]) => player[field] === value))
  return exactMatches.length === 1 ? exactMatches[0] : null
}
