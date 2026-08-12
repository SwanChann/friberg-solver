import { describe, expect, it } from 'vitest'
import { emptyManualFilters } from '../src/domain/constraint'
import type { GuessRecord } from '../src/domain/feedback'
import { calculateCandidates } from '../src/engine/candidateEngine'
import { comparePlayers } from '../src/engine/comparePlayers'
import { matchesFeedback } from '../src/engine/feedbackToConstraints'
import { makePlayer } from './helpers'

describe('feedback inference', () => {
  it('translates nationality yellow to different nationality AND same region', () => {
    const guess = makePlayer({ nationality: '法国', region: '欧洲' })
    const feedback = comparePlayers(guess, makePlayer({ nationality: '丹麦', region: '欧洲' }))
    expect(matchesFeedback(guess, feedback, makePlayer({ nationality: '瑞典', region: '欧洲' }))).toBe(true)
    expect(matchesFeedback(guess, feedback, makePlayer({ nationality: '法国', region: '欧洲' }))).toBe(false)
    expect(matchesFeedback(guess, feedback, makePlayer({ nationality: '巴西', region: '南美洲' }))).toBe(false)
  })

  it('translates age yellow/gray directions to exact ranges', () => {
    const guess = makePlayer({ age: 25 })
    const yellowHigher = comparePlayers(guess, makePlayer({ age: 28 }))
    expect([25, 26, 28, 29].filter((age) => matchesFeedback(guess, yellowHigher, makePlayer({ age })))).toEqual([26, 28])
    const grayHigher = comparePlayers(guess, makePlayer({ age: 29 }))
    expect([28, 29, 40].filter((age) => matchesFeedback(guess, grayHigher, makePlayer({ age })))).toEqual([29, 40])
  })

  it('translates championship yellow + lower to one exact value', () => {
    const guess = makePlayer({ major_championships: 2 })
    const feedback = comparePlayers(guess, makePlayer({ major_championships: 1 }))
    expect([0, 1, 2, 3].filter((value) => matchesFeedback(
      guess,
      feedback,
      makePlayer({ major_championships: value }),
    ))).toEqual([1])
  })

  it('infers exact region, role and active constraints', () => {
    const guess = makePlayer({ region: '欧洲', role: 'Rifler', is_active: true })
    const target = makePlayer({ region: '南美洲', role: 'AWPer', is_active: false })
    const feedback = comparePlayers(guess, target)
    expect(matchesFeedback(guess, feedback, target)).toBe(true)
    expect(matchesFeedback(guess, feedback, makePlayer({ region: '欧洲', role: 'AWPer', is_active: false }))).toBe(false)
    expect(matchesFeedback(guess, feedback, makePlayer({ region: '南美洲', role: 'Rifler', is_active: false }))).toBe(false)
    expect(matchesFeedback(guess, feedback, makePlayer({ region: '南美洲', role: 'AWPer', is_active: true }))).toBe(false)
  })

  it('infers Major appearance gray + lower as more than one below the guess', () => {
    const guess = makePlayer({ major_appearances: 6 })
    const feedback = comparePlayers(guess, makePlayer({ major_appearances: 4 }))
    expect([3, 4, 5, 6].filter((value) => matchesFeedback(
      guess,
      feedback,
      makePlayer({ major_appearances: value }),
    ))).toEqual([3, 4])
  })

  it('translates team yellow and gray using team_history', () => {
    const guess = makePlayer({ team: 'Falcons' })
    const prior = makePlayer({ team: 'G2', team_history: ['Falcons'] })
    const never = makePlayer({ team: 'G2', team_history: ['NIP'] })
    expect(matchesFeedback(guess, comparePlayers(guess, prior), prior)).toBe(true)
    expect(matchesFeedback(guess, comparePlayers(guess, prior), never)).toBe(false)
    expect(matchesFeedback(guess, comparePlayers(guess, never), never)).toBe(true)
    expect(matchesFeedback(guess, comparePlayers(guess, never), prior)).toBe(false)
  })

  it('uses only explicitly included OCR fields and ignores uncertain feedback', () => {
    const guess = makePlayer({ id: 20, nickname: 'guess', age: 25, role: 'Rifler' })
    const target = makePlayer({ id: 10, nickname: 'target', age: 28, role: 'AWPer' })
    const ageOnlyCandidate = makePlayer({ id: 11, nickname: 'age-only', age: 28, role: 'Rifler' })
    const wrongAge = makePlayer({ id: 12, nickname: 'wrong-age', age: 35, role: 'AWPer' })
    const feedback = comparePlayers(guess, target)
    expect(matchesFeedback(guess, feedback, ageOnlyCandidate, ['age'])).toBe(true)
    expect(matchesFeedback(guess, feedback, wrongAge, ['age'])).toBe(false)
    const record: GuessRecord = {
      id: 'ocr-1',
      playerNickname: guess.nickname,
      feedback,
      includedFields: ['age'],
    }
    expect(calculateCandidates(
      [guess, target, ageOnlyCandidate, wrongAge],
      emptyManualFilters(),
      [record],
    ).map((player) => player.nickname)).toEqual(['target', 'age-only'])
  })

  it('combines multiple guesses with AND and recomputes from all players after deletion', () => {
    const target = makePlayer({ id: 10, nickname: 'target', nationality: '法国', age: 28, role: 'AWPer' })
    const sameFirstPattern = makePlayer({ id: 11, nickname: 'other', nationality: '丹麦', age: 28, role: 'AWPer' })
    const guessA = makePlayer({ id: 20, nickname: 'guess-a', nationality: '瑞典', age: 25, role: 'Rifler' })
    const guessB = makePlayer({ id: 21, nickname: 'guess-b', nationality: '法国', age: 30, role: 'Rifler' })
    const all = [target, sameFirstPattern, guessA, guessB]
    const first: GuessRecord = { id: 'a', playerNickname: guessA.nickname, feedback: comparePlayers(guessA, target) }
    const second: GuessRecord = { id: 'b', playerNickname: guessB.nickname, feedback: comparePlayers(guessB, target) }
    const oneGuess = calculateCandidates(all, emptyManualFilters(), [first])
    const twoGuesses = calculateCandidates(all, emptyManualFilters(), [first, second])
    const afterDelete = calculateCandidates(all, emptyManualFilters(), [first])
    expect(oneGuess.map((player) => player.nickname)).toContain('other')
    expect(twoGuesses.map((player) => player.nickname)).toEqual(['target'])
    expect(afterDelete).toEqual(oneGuess)
  })
})
