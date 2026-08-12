import type { FeedbackField, FeedbackLevel, GuessFeedback } from '../../domain/feedback'
import { FEEDBACK_FIELDS, FIELD_LABELS, NUMERIC_FEEDBACK_FIELDS } from '../../domain/gameRules'
import type { Player } from '../../domain/player'

interface GuessFeedbackEditorProps {
  guess: Player
  feedback: GuessFeedback
  compact?: boolean
  teamHistoryEnabled?: boolean
  onChange: (feedback: GuessFeedback) => void
}

const closeAllowed = new Set<FeedbackField>([
  'nationality',
  'team',
  'age',
  'major_championships',
  'major_appearances',
])

function valueForField(player: Player, field: FeedbackField): string {
  if (field === 'is_active') return player.is_active ? '现役' : '非现役'
  return String(player[field])
}

export function GuessFeedbackEditor({
  guess,
  feedback,
  compact = false,
  teamHistoryEnabled = false,
  onChange,
}: GuessFeedbackEditorProps) {
  const setLevel = (field: FeedbackField, level: FeedbackLevel) => {
    const isNumeric = NUMERIC_FEEDBACK_FIELDS.has(field)
    onChange({
      ...feedback,
      attributes: {
        ...feedback.attributes,
        [field]: {
          level,
          direction: isNumeric && level !== 'correct'
            ? feedback.attributes[field].direction ?? 'higher'
            : null,
        },
      },
    })
  }

  return (
    <div className={`feedback-grid ${compact ? 'feedback-grid-compact' : ''}`}>
      {FEEDBACK_FIELDS.map((field) => {
        const attribute = feedback.attributes[field]
        const levels: FeedbackLevel[] = closeAllowed.has(field) && (field !== 'team' || teamHistoryEnabled)
          ? ['correct', 'close', 'wrong']
          : ['correct', 'wrong']
        return (
          <div className="feedback-cell" key={field}>
            <div className="feedback-label">
              <span>{FIELD_LABELS[field]}</span>
              <strong title={valueForField(guess, field)}>{valueForField(guess, field)}</strong>
            </div>
            <div className="feedback-actions">
              {levels.map((level) => (
                <button
                  type="button"
                  key={level}
                  className={`feedback-button feedback-${level} ${attribute.level === level ? 'selected' : ''}`}
                  onClick={() => setLevel(field, level)}
                  aria-label={`${FIELD_LABELS[field]} ${level}`}
                  title={level}
                >
                  {level === 'correct' ? '🟩' : level === 'close' ? '🟨' : '⬛'}
                </button>
              ))}
              {NUMERIC_FEEDBACK_FIELDS.has(field) && attribute.level !== 'correct' && (
                <button
                  type="button"
                  className="direction-button"
                  onClick={() => onChange({
                    ...feedback,
                    attributes: {
                      ...feedback.attributes,
                      [field]: {
                        ...attribute,
                        direction: attribute.direction === 'higher' ? 'lower' : 'higher',
                      },
                    },
                  })}
                  title="方向表示目标相对猜测值"
                >
                  {attribute.direction === 'higher' ? '↑' : '↓'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
