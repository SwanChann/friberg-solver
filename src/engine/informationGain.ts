import type { Player } from '../domain/player'
import { comparePlayers } from './comparePlayers'

export interface GuessRecommendation {
  player: Player
  informationScore: number
  expectedRemaining: number
  worstCaseRemaining: number
}

function feedbackKey(guess: Player, target: Player): string {
  const feedback = comparePlayers(guess, target)
  return [feedback.correct ? 'correct-player' : 'wrong-player', ...Object.values(feedback.attributes)
    .map((attribute) => `${attribute.level}:${attribute.direction ?? '-'}`)
  ].join('|')
}

export function rankGuesses(
  candidateTargets: Player[],
  potentialGuesses: Player[],
  limit = 8,
): GuessRecommendation[] {
  const count = candidateTargets.length
  if (count === 0) return []
  const beforeEntropy = Math.log2(count)
  return potentialGuesses.map((player) => {
    const partitions = new Map<string, number>()
    for (const target of candidateTargets) {
      const key = feedbackKey(player, target)
      partitions.set(key, (partitions.get(key) ?? 0) + 1)
    }
    const sizes = [...partitions.values()]
    const expectedRemaining = sizes.reduce((sum, size) => sum + size * size, 0) / count
    const expectedEntropy = sizes.reduce((sum, size) => {
      const probability = size / count
      return sum + probability * Math.log2(size)
    }, 0)
    return {
      player,
      informationScore: beforeEntropy - expectedEntropy,
      expectedRemaining,
      worstCaseRemaining: Math.max(...sizes),
    }
  }).sort((left, right) =>
    right.informationScore - left.informationScore
    || left.expectedRemaining - right.expectedRemaining
    || left.worstCaseRemaining - right.worstCaseRemaining
    || left.player.nickname.localeCompare(right.player.nickname)
  ).slice(0, limit)
}
