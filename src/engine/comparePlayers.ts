import type { AttributeFeedback, GuessFeedback } from '../domain/feedback'
import {
  AGE_CLOSE_RANGE,
  MAJOR_APPEARANCES_CLOSE_RANGE,
  MAJOR_CHAMPIONSHIPS_CLOSE_RANGE,
} from '../domain/gameRules'
import type { Player } from '../domain/player'

function textFeedback(guess: string, target: string): AttributeFeedback {
  return { level: guess === target ? 'correct' : 'wrong', direction: null }
}

function numberFeedback(guess: number, target: number, closeRange: number): AttributeFeedback {
  if (guess === target) return { level: 'correct', direction: null }
  return {
    level: Math.abs(guess - target) <= closeRange ? 'close' : 'wrong',
    direction: target > guess ? 'higher' : 'lower',
  }
}

function nationalityFeedback(guess: Player, target: Player): AttributeFeedback {
  if (guess.nationality === target.nationality) return { level: 'correct', direction: null }
  if (guess.region && guess.region === target.region) return { level: 'close', direction: null }
  return { level: 'wrong', direction: null }
}

function teamFeedback(guess: Player, target: Player): AttributeFeedback {
  if (guess.team === target.team) return { level: 'correct', direction: null }
  if (guess.team && target.team_history.includes(guess.team)) return { level: 'close', direction: null }
  return { level: 'wrong', direction: null }
}

export function comparePlayers(guess: Player, target: Player): GuessFeedback {
  return {
    correct: guess.id !== undefined && target.id !== undefined
      ? guess.id === target.id
      : guess.nickname === target.nickname,
    attributes: {
      nationality: nationalityFeedback(guess, target),
      region: textFeedback(guess.region, target.region),
      team: teamFeedback(guess, target),
      age: numberFeedback(guess.age, target.age, AGE_CLOSE_RANGE),
      role: textFeedback(guess.role, target.role),
      major_championships: numberFeedback(
        guess.major_championships,
        target.major_championships,
        MAJOR_CHAMPIONSHIPS_CLOSE_RANGE,
      ),
      major_appearances: numberFeedback(
        guess.major_appearances,
        target.major_appearances,
        MAJOR_APPEARANCES_CLOSE_RANGE,
      ),
      is_active: {
        level: Boolean(guess.is_active) === Boolean(target.is_active) ? 'correct' : 'wrong',
        direction: null,
      },
    },
  }
}
