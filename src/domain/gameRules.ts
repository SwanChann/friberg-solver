import type { FeedbackField } from './feedback'

export const AGE_CLOSE_RANGE = 3
export const MAJOR_CHAMPIONSHIPS_CLOSE_RANGE = 1
export const MAJOR_APPEARANCES_CLOSE_RANGE = 1
export const MAX_GUESSES = 8

export const FEEDBACK_FIELDS: FeedbackField[] = [
  'nationality',
  'team',
  'age',
  'role',
  'major_championships',
  'major_appearances',
  'is_active',
]

export const NUMERIC_FEEDBACK_FIELDS = new Set<FeedbackField>([
  'age',
  'major_championships',
  'major_appearances',
])

export const FIELD_LABELS: Record<FeedbackField, string> = {
  nationality: '国家或地区',
  region: '赛区（由国家反馈推导）',
  team: '队伍',
  age: '年龄',
  role: '位置',
  major_championships: 'Major 冠军',
  major_appearances: 'Major 参赛',
  is_active: '现役',
}
