import { describe, expect, it } from 'vitest'
import playersJson from '../data/players.json'
import type { Player } from '../src/domain/player'
import { comparePlayers } from '../src/engine/comparePlayers'
import { makePlayer } from './helpers'

describe('comparePlayers - upstream-compatible rules', () => {
  const target = makePlayer({ id: 10, nickname: 'target' })

  it('covers nationality: same, same region, and different region', () => {
    expect(comparePlayers(makePlayer({ nationality: '瑞典' }), target).attributes.nationality.level).toBe('correct')
    expect(comparePlayers(makePlayer({ nationality: '法国', region: '欧洲' }), target).attributes.nationality.level).toBe('close')
    expect(comparePlayers(makePlayer({ nationality: '巴西', region: '南美洲' }), target).attributes.nationality.level).toBe('wrong')
  })

  it('covers current, previous, and unknown team', () => {
    const targetWithHistory = makePlayer({ team: 'G2', team_history: ['Falcons', 'NIP'] })
    expect(comparePlayers(makePlayer({ team: 'G2' }), targetWithHistory).attributes.team.level).toBe('correct')
    expect(comparePlayers(makePlayer({ team: 'Falcons' }), targetWithHistory).attributes.team.level).toBe('close')
    expect(comparePlayers(makePlayer({ team: 'Liquid' }), targetWithHistory).attributes.team.level).toBe('wrong')
  })

  it.each([
    [0, 'correct', null],
    [1, 'close', 'lower'],
    [3, 'close', 'lower'],
    [4, 'wrong', 'lower'],
    [-1, 'close', 'higher'],
    [-3, 'close', 'higher'],
    [-4, 'wrong', 'higher'],
  ] as const)('age difference %s', (difference, level, direction) => {
    const guess = makePlayer({ age: target.age + difference })
    expect(comparePlayers(guess, target).attributes.age).toEqual({ level, direction })
  })

  it.each([
    [0, 'correct', null],
    [1, 'close', 'lower'],
    [2, 'wrong', 'lower'],
    [-1, 'close', 'higher'],
    [-2, 'wrong', 'higher'],
  ] as const)('championship difference %s', (difference, level, direction) => {
    const guess = makePlayer({ major_championships: target.major_championships + difference })
    expect(comparePlayers(guess, target).attributes.major_championships).toEqual({ level, direction })
  })

  it.each([
    [0, 'correct', null],
    [1, 'close', 'lower'],
    [2, 'wrong', 'lower'],
    [-1, 'close', 'higher'],
    [-2, 'wrong', 'higher'],
  ] as const)('appearance difference %s', (difference, level, direction) => {
    const guess = makePlayer({ major_appearances: target.major_appearances + difference })
    expect(comparePlayers(guess, target).attributes.major_appearances).toEqual({ level, direction })
  })

  it('handles role, active status, and exact identity', () => {
    const guess = makePlayer({ id: 2, role: 'AWPer', is_active: false })
    const feedback = comparePlayers(guess, target)
    expect(feedback.correct).toBe(false)
    expect(feedback.attributes.role.level).toBe('wrong')
    expect(feedback.attributes.is_active.level).toBe('wrong')
    expect(comparePlayers(target, target).correct).toBe(true)
  })

  it('matches a real bundled NiKo → ZywOo comparison under the upstream rules', () => {
    const players = playersJson as Player[]
    const guess = players.find((player) => player.nickname === 'NiKo（波黑）')!
    const targetPlayer = players.find((player) => player.nickname === 'ZywOo')!
    expect(comparePlayers(guess, targetPlayer)).toEqual({
      correct: false,
      attributes: {
        nationality: { level: 'close', direction: null },
        region: { level: 'correct', direction: null },
        team: { level: 'wrong', direction: null },
        age: { level: 'wrong', direction: 'lower' },
        role: { level: 'wrong', direction: null },
        major_championships: { level: 'wrong', direction: 'higher' },
        major_appearances: { level: 'wrong', direction: 'lower' },
        is_active: { level: 'correct', direction: null },
      },
    })
  })
})
