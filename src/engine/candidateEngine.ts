import type { GuessRecord } from '../domain/feedback'
import type { ManualFilters } from '../domain/constraint'
import type { Player } from '../domain/player'
import { matchesFeedback } from './feedbackToConstraints'
import { matchesManualFilters } from './filterPlayers'

export function calculateCandidates(
  allPlayers: Player[],
  filters: ManualFilters,
  guesses: GuessRecord[],
): Player[] {
  const playersByNickname = new Map(allPlayers.map((player) => [player.nickname, player]))
  return allPlayers.filter((target) => {
    if (!matchesManualFilters(target, filters)) return false
    return guesses.every((record) => {
      const guess = playersByNickname.get(record.playerNickname)
      return guess ? matchesFeedback(guess, record.feedback, target) : false
    })
  })
}
