export type FeedbackLevel = 'correct' | 'close' | 'wrong'
export type Direction = 'higher' | 'lower' | null

export type FeedbackField =
  | 'nationality'
  | 'region'
  | 'team'
  | 'age'
  | 'role'
  | 'major_championships'
  | 'major_appearances'
  | 'is_active'

export interface AttributeFeedback {
  level: FeedbackLevel
  direction: Direction
}

export type FeedbackAttributes = Record<FeedbackField, AttributeFeedback>

export interface GuessFeedback {
  attributes: FeedbackAttributes
  correct: boolean
}

export interface GuessRecord {
  id: string
  playerNickname: string
  feedback: GuessFeedback
}

export function emptyFeedback(): GuessFeedback {
  return {
    correct: false,
    attributes: {
      nationality: { level: 'wrong', direction: null },
      region: { level: 'wrong', direction: null },
      team: { level: 'wrong', direction: null },
      age: { level: 'wrong', direction: 'higher' },
      role: { level: 'wrong', direction: null },
      major_championships: { level: 'wrong', direction: 'higher' },
      major_appearances: { level: 'wrong', direction: 'higher' },
      is_active: { level: 'wrong', direction: null },
    },
  }
}
