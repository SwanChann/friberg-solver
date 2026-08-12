import { describe, expect, it } from 'vitest'
import playersJson from '../data/players.json'
import { emptyManualFilters } from '../src/domain/constraint'
import type { Player } from '../src/domain/player'
import { normalizeSourcePlayers, validatePlayers } from '../src/data/playerSchema'
import { filterPlayers, matchesNumericFilter } from '../src/engine/filterPlayers'
import { makePlayer } from './helpers'

describe('manual filters and bundled data', () => {
  it('validates the complete 646-player bootstrap with supported roles', () => {
    const players = validatePlayers(playersJson)
    expect(players).toHaveLength(646)
    expect(new Set(players.map((player) => player.role))).toEqual(new Set(['Rifler', 'AWPer', 'Coach']))
  })

  it('reports an invalid player at the exact array index and field', () => {
    const invalid = [{ ...playersJson[0], team_history: 'Falcons' }]
    expect(() => validatePlayers(invalid)).toThrow('players[0].team_history')
  })

  it('accepts imports without team_history and normalizes the canonical shape', () => {
    const { team_history: _history, ...withoutHistory } = playersJson[0]
    const players = normalizeSourcePlayers([withoutHistory])
    expect(players[0].team_history).toEqual([])
  })

  it('executes the required Europe / age 25 / Rifler / nationality exclusions example', () => {
    const players = playersJson as Player[]
    const filters = emptyManualFilters()
    filters.regionsInclude = ['欧洲']
    filters.age = { operator: '=', value: 25, max: null }
    filters.rolesInclude = ['Rifler']
    filters.nationalitiesExclude = ['瑞典', '英国', '法国', '西班牙']
    const result = filterPlayers(players, filters)
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((player) => (
      player.region === '欧洲'
      && player.age === 25
      && player.role === 'Rifler'
      && !filters.nationalitiesExclude.includes(player.nationality)
    ))).toBe(true)
  })

  it('distinguishes current team from previously and never played for', () => {
    const players = [
      makePlayer({ nickname: 'previous', team: 'G2', team_history: ['Falcons'] }),
      makePlayer({ nickname: 'current', team: 'Falcons', team_history: ['G2'] }),
      makePlayer({ nickname: 'never', team: 'Liquid', team_history: ['NIP'] }),
    ]
    const filters = emptyManualFilters()
    filters.currentTeamsExclude = ['Falcons']
    filters.everTeams = ['Falcons']
    expect(filterPlayers(players, filters).map((player) => player.nickname)).toEqual(['previous'])
  })

  it('treats multiple ever-played tags as an IN set', () => {
    const players = [
      makePlayer({ nickname: 'falcons-history', team_history: ['Falcons'] }),
      makePlayer({ nickname: 'g2-history', team_history: ['G2'] }),
      makePlayer({ nickname: 'other-history', team_history: ['NIP'] }),
    ]
    const filters = emptyManualFilters()
    filters.everTeams = ['Falcons', 'G2']
    expect(filterPlayers(players, filters).map((player) => player.nickname))
      .toEqual(['falcons-history', 'g2-history'])
  })

  it.each([
    ['=', 25, null, true],
    ['=', 24, null, false],
    ['!=', 24, null, true],
    ['!=', 25, null, false],
    ['>', 24, null, true],
    ['>', 25, null, false],
    ['>=', 25, null, true],
    ['>=', 26, null, false],
    ['<', 26, null, true],
    ['<', 25, null, false],
    ['<=', 25, null, true],
    ['<=', 24, null, false],
    ['between', 24, 27, true],
    ['between', 26, 30, false],
    ['between', 27, 24, true],
  ] as const)('supports numeric operator %s with bounds %s/%s', (operator, value, max, expected) => {
    expect(matchesNumericFilter(25, { operator, value, max })).toBe(expected)
  })

  it('combines nickname, region, nationality, role, current team and active filters', () => {
    const players = [
      makePlayer({ nickname: 'Alpha One', nationality: '丹麦', region: '欧洲', role: 'Rifler', team: 'G2', is_active: true }),
      makePlayer({ nickname: 'Alpha Two', nationality: '瑞典', region: '欧洲', role: 'AWPer', team: 'NIP', is_active: true }),
      makePlayer({ nickname: 'Beta', nationality: '巴西', region: '南美洲', role: 'Rifler', team: 'FURIA', is_active: false }),
    ]
    const filters = emptyManualFilters()
    filters.nickname = 'alpha'
    filters.regionsInclude = ['欧洲']
    filters.regionsExclude = ['南美洲']
    filters.nationalitiesInclude = ['丹麦', '瑞典']
    filters.nationalitiesExclude = ['瑞典']
    filters.rolesInclude = ['Rifler']
    filters.rolesExclude = ['Coach']
    filters.currentTeamsInclude = ['G2', 'NIP']
    filters.currentTeamsExclude = ['NIP']
    filters.active = 'active'
    expect(filterPlayers(players, filters).map((player) => player.nickname)).toEqual(['Alpha One'])
  })

  it('filters disabled records from every candidate pool', () => {
    const players = [
      makePlayer({ nickname: 'enabled', is_enabled: true }),
      makePlayer({ nickname: 'disabled', is_enabled: false }),
    ]
    expect(filterPlayers(players, emptyManualFilters()).map((player) => player.nickname)).toEqual(['enabled'])
  })
})
