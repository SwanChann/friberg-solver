import { describe, expect, it } from 'vitest'
import { rankGuesses } from '../src/engine/informationGain'
import { makePlayer } from './helpers'

describe('information gain', () => {
  it('reports entropy, expected remaining, and worst-case remaining from comparePlayers partitions', () => {
    const candidates = [
      makePlayer({ id: 1, nickname: 'a', nationality: '法国' }),
      makePlayer({ id: 2, nickname: 'b', nationality: '瑞典' }),
      makePlayer({ id: 3, nickname: 'c', nationality: '巴西', region: '南美洲' }),
    ]
    const ranked = rankGuesses(candidates, candidates)
    expect(ranked).toHaveLength(3)
    expect(ranked[0].informationScore).toBeGreaterThan(0)
    expect(ranked[0].expectedRemaining).toBeGreaterThanOrEqual(1)
    expect(ranked[0].worstCaseRemaining).toBeGreaterThanOrEqual(1)
  })
})
