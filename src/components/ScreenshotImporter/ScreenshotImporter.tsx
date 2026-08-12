import { useEffect, useRef, useState } from 'react'
import type { FeedbackField, GuessRecord } from '../../domain/feedback'
import type { Player } from '../../domain/player'
import { analyzeScreenshot, type OcrProgress } from '../../ocr/screenshotOcr'

interface ScreenshotImporterProps {
  players: Player[]
  hasTeamHistory: boolean
  onApply: (guesses: GuessRecord[]) => void
}

interface AutoApplySummary {
  detectedRows: number
  appliedRows: number
  discardedRows: number
  usedConditions: number
  discardedConditions: number
  playerNames: string[]
  details: string[]
}

const VISIBLE_FIELD_COUNT = 7

function visibleFieldCount(fields: FeedbackField[]): number {
  return fields.filter((field) => field !== 'region').length
}

export function ScreenshotImporter({ players, hasTeamHistory, onApply }: ScreenshotImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [summary, setSummary] = useState<AutoApplySummary | null>(null)
  const [progress, setProgress] = useState<OcrProgress | null>(null)
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const processFile = async (file: File) => {
    setError('')
    setSummary(null)
    setIsBusy(true)
    try {
      const result = await analyzeScreenshot(file, players, setProgress)
      const stamp = Date.now()
      const records: GuessRecord[] = []
      const details = new Set<string>()
      let discardedRows = 0
      let usedConditions = 0
      let discardedConditions = 0

      result.drafts.forEach((draft, index) => {
        draft.warnings.forEach((warning) => details.add(warning))
        if (!draft.playerNickname) {
          discardedRows += 1
          discardedConditions += VISIBLE_FIELD_COUNT
          return
        }

        const includedFields = [...draft.includedFields]
        if (!hasTeamHistory && draft.feedback.attributes.team.level === 'close') {
          const teamIndex = includedFields.indexOf('team')
          if (teamIndex >= 0) includedFields.splice(teamIndex, 1)
          details.add('队伍为黄色但数据没有 team_history，已忽略队伍字段')
        }
        const includedVisible = visibleFieldCount(includedFields)
        if (!includedVisible) {
          discardedRows += 1
          discardedConditions += VISIBLE_FIELD_COUNT
          details.add(`${draft.playerNickname} 没有可靠反馈字段，已忽略整行`)
          return
        }

        usedConditions += includedVisible
        discardedConditions += VISIBLE_FIELD_COUNT - includedVisible
        records.push({
          id: `${stamp}-ocr-${index}-${draft.playerNickname}`,
          playerNickname: draft.playerNickname,
          feedback: draft.feedback,
          includedFields,
        })
      })

      onApply(records)
      setSummary({
        detectedRows: result.drafts.length,
        appliedRows: records.length,
        discardedRows,
        usedConditions,
        discardedConditions,
        playerNames: records.map((record) => record.playerNickname),
        details: [...details],
      })
      setProgress({
        progress: 1,
        status: records.length
          ? `已自动应用 ${records.length} 行可靠信息，候选与推荐已更新`
          : '没有可靠行可用，已清空截图约束并显示全量推荐',
      })
      window.setTimeout(() => {
        document.querySelector('.recommendations')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    } catch (cause) {
      setProgress(null)
      setError(cause instanceof Error ? cause.message : '截图识别失败。')
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const image = [...(event.clipboardData?.files ?? [])].find((file) => file.type.startsWith('image/'))
      if (!image || isBusy) return
      event.preventDefault()
      void processFile(image)
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  })

  return (
    <section className="solver-card screenshot-importer">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">LOCAL SCREENSHOT OCR</span>
          <h2>截图识别并自动筛选 <small>不确定信息自动作废</small></h2>
        </div>
        {summary && <span className="count-chip">{summary.appliedRows}</span>}
      </div>

      <div
        className={`ocr-dropzone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          const image = [...event.dataTransfer.files].find((file) => file.type.startsWith('image/'))
          if (image && !isBusy) void processFile(image)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void processFile(file)
          }}
        />
        <div>
          <strong>粘贴、拖入或选择实时截图</strong>
          <span>识别后立即筛选并跳到推荐；不需要人工确认。</span>
        </div>
        <button type="button" className="ghost-button" disabled={isBusy} onClick={() => inputRef.current?.click()}>
          {isBusy ? '识别中…' : '选择截图'}
        </button>
      </div>

      {progress && (
        <div className="ocr-progress" aria-live="polite">
          <div><span style={{ width: `${Math.round(progress.progress * 100)}%` }} /></div>
          <small>{progress.status}</small>
        </div>
      )}
      {error && <p className="ocr-error" role="alert">{error}</p>}

      {summary && (
        <div className="ocr-auto-summary" role="status">
          <div className="ocr-auto-summary-heading">
            <strong>已自动筛选</strong>
            <span>
              检出 {summary.detectedRows} 行 · 采用 {summary.appliedRows} 行 / {summary.usedConditions} 个条件
              {' · '}忽略 {summary.discardedRows} 行 / {summary.discardedConditions} 个条件
            </span>
          </div>
          {summary.playerNames.length > 0 && (
            <p>已采用选手：{summary.playerNames.join('、')}</p>
          )}
          {summary.details.length > 0 && (
            <details>
              <summary>查看自动忽略的低可信信息（{summary.details.length}）</summary>
              <div className="ocr-row-warnings">
                {summary.details.map((detail) => <span key={detail}>{detail}</span>)}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  )
}
