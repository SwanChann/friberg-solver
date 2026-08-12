import type { ManualFilters, NumericFilter } from '../domain/constraint'
import type { Player } from '../domain/player'

export function matchesNumericFilter(value: number, filter: NumericFilter): boolean {
  if (filter.operator === 'any') return true
  if (filter.value === null) return true
  switch (filter.operator) {
    case '=': return value === filter.value
    case '!=': return value !== filter.value
    case '>': return value > filter.value
    case '>=': return value >= filter.value
    case '<': return value < filter.value
    case '<=': return value <= filter.value
    case 'between': return filter.max === null || (value >= Math.min(filter.value, filter.max) && value <= Math.max(filter.value, filter.max))
  }
}

function includesAll(values: string[], selected: string[]): boolean {
  return selected.length === 0 || selected.includes(values[0])
}

function excludesAll(value: string, excluded: string[]): boolean {
  return !excluded.includes(value)
}

export function matchesManualFilters(player: Player, filters: ManualFilters): boolean {
  const nickname = filters.nickname.trim().toLocaleLowerCase()
  if (nickname && !player.nickname.toLocaleLowerCase().includes(nickname)) return false
  if (!includesAll([player.region], filters.regionsInclude) || !excludesAll(player.region, filters.regionsExclude)) return false
  if (!includesAll([player.nationality], filters.nationalitiesInclude) || !excludesAll(player.nationality, filters.nationalitiesExclude)) return false
  if (filters.rolesInclude.length && !filters.rolesInclude.includes(player.role)) return false
  if (filters.rolesExclude.includes(player.role)) return false
  if (!includesAll([player.team], filters.currentTeamsInclude) || !excludesAll(player.team, filters.currentTeamsExclude)) return false
  if (filters.everTeams.length && !filters.everTeams.some((team) => player.team_history.includes(team))) return false
  if (filters.neverTeams.some((team) => player.team_history.includes(team))) return false
  if (!matchesNumericFilter(player.age, filters.age)) return false
  if (!matchesNumericFilter(player.major_championships, filters.majorChampionships)) return false
  if (!matchesNumericFilter(player.major_appearances, filters.majorAppearances)) return false
  if (filters.active === 'active' && !player.is_active) return false
  if (filters.active === 'inactive' && player.is_active) return false
  return player.is_enabled !== false
}

export function filterPlayers(players: Player[], filters: ManualFilters): Player[] {
  return players.filter((player) => matchesManualFilters(player, filters))
}
