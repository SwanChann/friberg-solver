import type { Player } from '../src/domain/player'

export function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 1,
    nickname: 'base',
    nationality: '瑞典',
    region: '欧洲',
    team: 'NIP',
    team_history: [],
    age: 25,
    role: 'Rifler',
    major_championships: 1,
    major_appearances: 5,
    is_active: true,
    is_enabled: true,
    difficulties: ['normal'],
    ...overrides,
  }
}
