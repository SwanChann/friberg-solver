import type { Player, PlayerRole } from './player'

export type NumericOperator = 'any' | '=' | '!=' | '>' | '>=' | '<' | '<=' | 'between'

export interface NumericFilter {
  operator: NumericOperator
  value: number | null
  max: number | null
}

export type ActiveFilter = 'any' | 'active' | 'inactive'

export interface ManualFilters {
  nickname: string
  regionsInclude: string[]
  regionsExclude: string[]
  nationalitiesInclude: string[]
  nationalitiesExclude: string[]
  rolesInclude: PlayerRole[]
  rolesExclude: PlayerRole[]
  currentTeamsInclude: string[]
  currentTeamsExclude: string[]
  everTeams: string[]
  neverTeams: string[]
  age: NumericFilter
  majorChampionships: NumericFilter
  majorAppearances: NumericFilter
  active: ActiveFilter
}

export interface PlayerConstraint {
  field: string
  description: string
  test: (player: Player) => boolean
}

export const emptyNumericFilter = (): NumericFilter => ({ operator: 'any', value: null, max: null })

export function emptyManualFilters(): ManualFilters {
  return {
    nickname: '',
    regionsInclude: [],
    regionsExclude: [],
    nationalitiesInclude: [],
    nationalitiesExclude: [],
    rolesInclude: [],
    rolesExclude: [],
    currentTeamsInclude: [],
    currentTeamsExclude: [],
    everTeams: [],
    neverTeams: [],
    age: emptyNumericFilter(),
    majorChampionships: emptyNumericFilter(),
    majorAppearances: emptyNumericFilter(),
    active: 'any',
  }
}
