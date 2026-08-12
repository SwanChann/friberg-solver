import { describe, expect, it } from 'vitest'
import { sortPlayers, type SortField } from '../src/components/CandidateTable/CandidateTable'
import { makePlayer } from './helpers'

describe('candidate table sorting', () => {
  const first = makePlayer({
    id: 1,
    nickname: 'Alpha',
    nationality: '丹麦',
    region: '欧洲',
    age: 20,
    role: 'AWPer',
    team: 'A-Team',
    major_championships: 0,
    major_appearances: 1,
    is_active: false,
  })
  const second = makePlayer({
    id: 2,
    nickname: 'Zulu',
    nationality: '瑞典',
    region: '南美洲',
    age: 30,
    role: 'Rifler',
    team: 'Z-Team',
    major_championships: 2,
    major_appearances: 8,
    is_active: true,
  })

  it.each([
    'nickname',
    'nationality',
    'region',
    'age',
    'role',
    'team',
    'major_championships',
    'major_appearances',
    'is_active',
  ] satisfies SortField[])('sorts the %s column in both directions', (field) => {
    const ascending = sortPlayers([second, first], { field, direction: 'asc' })
    const descending = sortPlayers([first, second], { field, direction: 'desc' })
    expect(descending).toEqual([...ascending].reverse())
  })
})
