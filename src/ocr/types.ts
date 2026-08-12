import type { FeedbackField, GuessFeedback } from '../domain/feedback'

export type ScreenshotFeedbackField =
  | 'team'
  | 'nationality'
  | 'age'
  | 'role'
  | 'major_championships'
  | 'major_appearances'
  | 'is_active'

export const SCREENSHOT_FEEDBACK_FIELDS: ScreenshotFeedbackField[] = [
  'team',
  'nationality',
  'age',
  'role',
  'major_championships',
  'major_appearances',
  'is_active',
]

export interface ImagePixels {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface ImageRect {
  x: number
  y: number
  width: number
  height: number
}

export interface DetectedCell extends ImageRect {
  level: 'correct' | 'close' | 'wrong'
  confidence: number
}

export interface DetectedScreenshotRow {
  row: ImageRect
  nickname: ImageRect
  cells: Record<ScreenshotFeedbackField, DetectedCell>
  feedback: GuessFeedback
  includedFields: FeedbackField[]
  warnings: string[]
}

export interface NicknameCandidate {
  nickname: string
  score: number
}

export interface ScreenshotGuessDraft {
  id: string
  rawNickname: string
  playerNickname: string
  nicknameConfidence: number
  alternatives: NicknameCandidate[]
  feedback: GuessFeedback
  includedFields: FeedbackField[]
  warnings: string[]
}
