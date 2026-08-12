import type { AttributeFeedback, FeedbackField, GuessFeedback } from '../domain/feedback'
import {
  AGE_CLOSE_RANGE,
  MAJOR_APPEARANCES_CLOSE_RANGE,
  MAJOR_CHAMPIONSHIPS_CLOSE_RANGE,
} from '../domain/gameRules'
import type { PlayerConstraint } from '../domain/constraint'
import type { Player } from '../domain/player'

function numericConstraint(
  field: 'age' | 'major_championships' | 'major_appearances',
  value: number,
  closeRange: number,
  feedback: AttributeFeedback,
): PlayerConstraint {
  const direction = feedback.direction
  return {
    field,
    description: `${field} ${feedback.level}${direction ? ` + ${direction}` : ''}`,
    test: (target) => {
      const targetValue = target[field]
      if (feedback.level === 'correct') return targetValue === value
      if (direction === null) return false
      const delta = targetValue - value
      const directionMatches = direction === 'higher' ? delta > 0 : delta < 0
      if (!directionMatches) return false
      if (feedback.level === 'close') return Math.abs(delta) <= closeRange
      return Math.abs(delta) > closeRange
    },
  }
}

export function feedbackToConstraints(
  guess: Player,
  feedback: GuessFeedback,
  includedFields?: FeedbackField[],
): PlayerConstraint[] {
  const a = feedback.attributes
  const constraints: PlayerConstraint[] = [
    {
      field: 'nationality',
      description: `nationality ${a.nationality.level}`,
      test: (target) => {
        if (a.nationality.level === 'correct') return target.nationality === guess.nationality
        if (a.nationality.level === 'close') {
          return target.nationality !== guess.nationality && Boolean(guess.region) && target.region === guess.region
        }
        return target.nationality !== guess.nationality && (!guess.region || target.region !== guess.region)
      },
    },
    {
      field: 'region',
      description: `region ${a.region.level}`,
      test: (target) => a.region.level === 'correct'
        ? target.region === guess.region
        : a.region.level === 'wrong' && target.region !== guess.region,
    },
    {
      field: 'team',
      description: `team ${a.team.level}`,
      test: (target) => {
        if (a.team.level === 'correct') return target.team === guess.team
        if (a.team.level === 'close') {
          return target.team !== guess.team && Boolean(guess.team) && target.team_history.includes(guess.team)
        }
        return target.team !== guess.team && (!guess.team || !target.team_history.includes(guess.team))
      },
    },
    numericConstraint('age', guess.age, AGE_CLOSE_RANGE, a.age),
    {
      field: 'role',
      description: `role ${a.role.level}`,
      test: (target) => a.role.level === 'correct'
        ? target.role === guess.role
        : a.role.level === 'wrong' && target.role !== guess.role,
    },
    numericConstraint(
      'major_championships',
      guess.major_championships,
      MAJOR_CHAMPIONSHIPS_CLOSE_RANGE,
      a.major_championships,
    ),
    numericConstraint(
      'major_appearances',
      guess.major_appearances,
      MAJOR_APPEARANCES_CLOSE_RANGE,
      a.major_appearances,
    ),
    {
      field: 'is_active',
      description: `is_active ${a.is_active.level}`,
      test: (target) => a.is_active.level === 'correct'
        ? Boolean(target.is_active) === Boolean(guess.is_active)
        : a.is_active.level === 'wrong' && Boolean(target.is_active) !== Boolean(guess.is_active),
    },
  ]
  if (!includedFields) return constraints
  const included = new Set(includedFields)
  return constraints.filter((constraint) => included.has(constraint.field as FeedbackField))
}

export function matchesFeedback(
  guess: Player,
  feedback: GuessFeedback,
  target: Player,
  includedFields?: FeedbackField[],
): boolean {
  return feedbackToConstraints(guess, feedback, includedFields).every((constraint) => constraint.test(target))
}
