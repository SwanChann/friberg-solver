import { describe, expect, it } from 'vitest'
import { emptyManualFilters } from '../src/domain/constraint'
import type { GuessRecord } from '../src/domain/feedback'
import {
  defaultPersistedState,
  persistState,
  restoreState,
  STATE_KEY,
} from '../src/data/sessionState'
import { comparePlayers } from '../src/engine/comparePlayers'
import { makePlayer } from './helpers'

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

describe('session persistence', () => {
  it('round-trips the selected tab, manual filters, guesses, and table sort', () => {
    const storage = memoryStorage()
    const filters = emptyManualFilters()
    filters.nickname = 'niko'
    filters.regionsInclude = ['欧洲']
    filters.age = { operator: 'between', value: 24, max: 27 }
    const guess = makePlayer({ id: 2, nickname: 'guess' })
    const target = makePlayer({ id: 3, nickname: 'target', age: 29 })
    const guesses: GuessRecord[] = [{
      id: 'guess-1',
      playerNickname: guess.nickname,
      feedback: comparePlayers(guess, target),
    }]
    const expected = {
      tab: 'solver' as const,
      filters,
      guesses,
      sort: { field: 'age' as const, direction: 'desc' as const },
    }
    persistState(expected, storage)
    expect(restoreState(storage)).toEqual(expected)
  })

  it('removes corrupt JSON and returns a safe default', () => {
    const storage = memoryStorage({ [STATE_KEY]: '{invalid' })
    expect(restoreState(storage)).toEqual(defaultPersistedState())
    expect(storage.getItem(STATE_KEY)).toBeNull()
  })
})
