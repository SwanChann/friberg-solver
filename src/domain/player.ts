export const PLAYER_ROLES = ['Rifler', 'AWPer', 'Coach'] as const

export type PlayerRole = (typeof PLAYER_ROLES)[number]

export interface Player {
  id?: number
  nickname: string
  nationality: string
  region: string
  team: string
  team_history: string[]
  age: number
  role: PlayerRole
  major_championships: number
  major_appearances: number
  is_active: boolean
  is_enabled?: boolean
  difficulties?: string[]
}

export interface DatasetMetadata {
  source: string
  sourceType: 'official' | 'snapshot' | 'reconstructed'
  snapshotDate: string
  version: string
  playerCount: number
  retrievedAt: string
  notes: string
  sourceCommit?: string
  mirror?: string
  mirrorCommit?: string
  sha256?: string
  teamHistoryCoverage?: string
}

export function playerKey(player: Player): string {
  return player.id === undefined ? player.nickname : String(player.id)
}
