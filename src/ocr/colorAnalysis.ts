import { emptyFeedback, type Direction, type FeedbackField, type FeedbackLevel } from '../domain/feedback'
import { FIELD_LABELS } from '../domain/gameRules'
import type {
  DetectedCell,
  DetectedScreenshotRow,
  ImagePixels,
  ImageRect,
  ScreenshotFeedbackField,
} from './types'
import { SCREENSHOT_FEEDBACK_FIELDS } from './types'

interface ColorAnchor {
  level: FeedbackLevel
  rgb: [number, number, number]
}

const COLOR_ANCHORS: ColorAnchor[] = [
  { level: 'correct', rgb: [0x19, 0x9a, 0x60] },
  { level: 'close', rgb: [0xcd, 0x7d, 0x0e] },
  { level: 'wrong', rgb: [0xa8, 0x9b, 0xa3] },
  { level: 'correct', rgb: [0x38, 0xbd, 0x78] },
  { level: 'close', rgb: [0xd5, 0x96, 0x32] },
  { level: 'wrong', rgb: [0x67, 0x55, 0x63] },
]

const MAX_COLOR_DISTANCE = 64
export const TRUSTED_COLOR_CONFIDENCE = 0.9
export const TRUSTED_DIRECTION_CONFIDENCE = 0.7

function distance(r: number, g: number, b: number, anchor: [number, number, number]): number {
  return Math.hypot(r - anchor[0], g - anchor[1], b - anchor[2])
}

export function classifyFeedbackColor(r: number, g: number, b: number): {
  level: FeedbackLevel
  distance: number
} | null {
  let best: { level: FeedbackLevel; distance: number } | null = null
  for (const anchor of COLOR_ANCHORS) {
    const candidateDistance = distance(r, g, b, anchor.rgb)
    if (!best || candidateDistance < best.distance) best = { level: anchor.level, distance: candidateDistance }
  }
  return best && best.distance <= MAX_COLOR_DISTANCE ? best : null
}

function pixelAt(image: ImagePixels, x: number, y: number): [number, number, number] {
  const offset = (y * image.width + x) * 4
  return [image.data[offset], image.data[offset + 1], image.data[offset + 2]]
}

function scanRuns(active: boolean[], minimumLength: number, mergeGap: number): Array<{ start: number; end: number }> {
  const raw: Array<{ start: number; end: number }> = []
  let start = -1
  for (let index = 0; index <= active.length; index += 1) {
    if (active[index] && start < 0) start = index
    if ((!active[index] || index === active.length) && start >= 0) {
      raw.push({ start, end: index - 1 })
      start = -1
    }
  }
  const merged: Array<{ start: number; end: number }> = []
  for (const run of raw) {
    const previous = merged[merged.length - 1]
    if (previous && run.start - previous.end - 1 <= mergeGap) previous.end = run.end
    else merged.push({ ...run })
  }
  return merged.filter((run) => run.end - run.start + 1 >= minimumLength)
}

function detectRowBands(image: ImagePixels): Array<{ start: number; end: number }> {
  const step = Math.max(1, Math.floor(image.width / 500))
  const minimumHits = Math.max(18, Math.floor(image.width / step * 0.11))
  const active = new Array<boolean>(image.height).fill(false)
  for (let y = 0; y < image.height; y += 1) {
    let hits = 0
    for (let x = 0; x < image.width; x += step) {
      const [r, g, b] = pixelAt(image, x, y)
      if (classifyFeedbackColor(r, g, b)) hits += 1
    }
    active[y] = hits >= minimumHits
  }
  return scanRuns(active, Math.max(10, Math.floor(image.height * 0.018)), Math.max(2, Math.floor(image.height * 0.006)))
}

function detectCellRuns(image: ImagePixels, band: { start: number; end: number }): Array<{ start: number; end: number }> {
  const height = band.end - band.start + 1
  const yStep = Math.max(1, Math.floor(height / 30))
  const samples = Math.ceil(height / yStep)
  const active = new Array<boolean>(image.width).fill(false)
  for (let x = 0; x < image.width; x += 1) {
    let hits = 0
    for (let y = band.start; y <= band.end; y += yStep) {
      const [r, g, b] = pixelAt(image, x, y)
      if (classifyFeedbackColor(r, g, b)) hits += 1
    }
    active[x] = hits / samples >= 0.52
  }
  return scanRuns(active, Math.max(10, Math.floor(image.width * 0.012)), Math.max(1, Math.floor(image.width * 0.003)))
}

function classifyCell(image: ImagePixels, rect: ImageRect): DetectedCell {
  const counts: Record<FeedbackLevel, number> = { correct: 0, close: 0, wrong: 0 }
  let classified = 0
  let sampled = 0
  const xStep = Math.max(1, Math.floor(rect.width / 40))
  const yStep = Math.max(1, Math.floor(rect.height / 30))
  for (let y = rect.y + 1; y < rect.y + rect.height - 1; y += yStep) {
    for (let x = rect.x + 1; x < rect.x + rect.width - 1; x += xStep) {
      sampled += 1
      const [r, g, b] = pixelAt(image, x, y)
      const result = classifyFeedbackColor(r, g, b)
      if (result) {
        counts[result.level] += 1
        classified += 1
      }
    }
  }
  const level = (Object.entries(counts) as Array<[FeedbackLevel, number]>)
    .sort((left, right) => right[1] - left[1])[0][0]
  const purity = classified ? counts[level] / classified : 0
  const coverage = sampled ? classified / sampled : 0
  return { ...rect, level, confidence: Math.min(purity, coverage / 0.65, 1) }
}

function dominantBackground(image: ImagePixels, rect: ImageRect): [number, number, number] {
  const buckets = new Map<string, { count: number; rgb: [number, number, number] }>()
  const xStep = Math.max(1, Math.floor(rect.width / 25))
  const yStep = Math.max(1, Math.floor(rect.height / 20))
  for (let y = rect.y + 2; y < rect.y + rect.height - 2; y += yStep) {
    for (let x = rect.x + 2; x < rect.x + rect.width - 2; x += xStep) {
      const rgb = pixelAt(image, x, y)
      const key = rgb.map((value) => Math.round(value / 8)).join(',')
      const bucket = buckets.get(key)
      if (bucket) bucket.count += 1
      else buckets.set(key, { count: 1, rgb })
    }
  }
  return [...buckets.values()].sort((left, right) => right.count - left.count)[0]?.rgb ?? [0, 0, 0]
}

interface Component {
  points: Array<{ x: number; y: number }>
  minX: number
  maxX: number
  minY: number
  maxY: number
}

function directionFromCell(image: ImagePixels, cell: DetectedCell): { direction: Direction; confidence: number } {
  if (cell.level === 'correct') return { direction: null, confidence: 1 }
  const background = dominantBackground(image, cell)
  const localWidth = cell.width
  const localHeight = cell.height
  const mask = new Uint8Array(localWidth * localHeight)
  for (let y = 2; y < localHeight - 2; y += 1) {
    for (let x = Math.floor(localWidth * 0.52); x < localWidth - 2; x += 1) {
      const [r, g, b] = pixelAt(image, cell.x + x, cell.y + y)
      const colorDelta = distance(r, g, b, background)
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const backgroundLuminance = 0.2126 * background[0] + 0.7152 * background[1] + 0.0722 * background[2]
      if (colorDelta >= 28 && luminance >= backgroundLuminance + 18) mask[y * localWidth + x] = 1
    }
  }

  const visited = new Uint8Array(mask.length)
  const components: Component[] = []
  for (let y = 0; y < localHeight; y += 1) {
    for (let x = 0; x < localWidth; x += 1) {
      const origin = y * localWidth + x
      if (!mask[origin] || visited[origin]) continue
      const component: Component = { points: [], minX: x, maxX: x, minY: y, maxY: y }
      const queue = [origin]
      visited[origin] = 1
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const index = queue[cursor]
        const pointX = index % localWidth
        const pointY = Math.floor(index / localWidth)
        component.points.push({ x: pointX, y: pointY })
        component.minX = Math.min(component.minX, pointX)
        component.maxX = Math.max(component.maxX, pointX)
        component.minY = Math.min(component.minY, pointY)
        component.maxY = Math.max(component.maxY, pointY)
        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            const nextX = pointX + offsetX
            const nextY = pointY + offsetY
            if (nextX < 0 || nextY < 0 || nextX >= localWidth || nextY >= localHeight) continue
            const next = nextY * localWidth + nextX
            if (mask[next] && !visited[next]) {
              visited[next] = 1
              queue.push(next)
            }
          }
        }
      }
      if (component.points.length >= 5 && component.maxY - component.minY >= Math.max(5, localHeight * 0.12)) {
        components.push(component)
      }
    }
  }

  const arrow = components
    .filter((component) => component.maxX >= localWidth * 0.63 && component.maxX - component.minX >= 3)
    .sort((left, right) => right.maxX - left.maxX || right.points.length - left.points.length)[0]
  if (!arrow) return { direction: null, confidence: 0 }
  const height = Math.max(1, arrow.maxY - arrow.minY)
  const centroidY = arrow.points.reduce((sum, point) => sum + point.y, 0) / arrow.points.length
  const normalizedCentroid = (centroidY - arrow.minY) / height
  const distanceFromCenter = Math.abs(normalizedCentroid - 0.5)
  if (distanceFromCenter < 0.035) return { direction: null, confidence: 0.3 }
  return {
    direction: normalizedCentroid < 0.5 ? 'higher' : 'lower',
    confidence: Math.min(1, 0.55 + distanceFromCenter * 4),
  }
}

function feedbackFromCells(
  image: ImagePixels,
  cells: Record<ScreenshotFeedbackField, DetectedCell>,
): {
  feedback: ReturnType<typeof emptyFeedback>
  includedFields: FeedbackField[]
  warnings: string[]
} {
  const feedback = emptyFeedback()
  const includedFields: FeedbackField[] = []
  const warnings: string[] = []
  for (const field of SCREENSHOT_FEEDBACK_FIELDS) {
    feedback.attributes[field] = { level: cells[field].level, direction: null }
    if (cells[field].confidence >= TRUSTED_COLOR_CONFIDENCE) {
      includedFields.push(field)
    } else {
      warnings.push(`${FIELD_LABELS[field]}颜色不确定，已忽略`)
    }
  }
  feedback.attributes.region = {
    level: feedback.attributes.nationality.level === 'wrong' ? 'wrong' : 'correct',
    direction: null,
  }
  for (const field of ['age', 'major_championships', 'major_appearances'] as const) {
    const result = directionFromCell(image, cells[field])
    feedback.attributes[field].direction = result.direction
    if (
      cells[field].level !== 'correct'
      && (!result.direction || result.confidence < TRUSTED_DIRECTION_CONFIDENCE)
    ) {
      const includedIndex = includedFields.indexOf(field)
      if (includedIndex >= 0) includedFields.splice(includedIndex, 1)
      warnings.push(`${FIELD_LABELS[field]}箭头不确定，已忽略该字段`)
    }
  }
  if (includedFields.includes('nationality')) includedFields.push('region')
  feedback.correct = SCREENSHOT_FEEDBACK_FIELDS.every((field) => cells[field].level === 'correct')
  return { feedback, includedFields, warnings }
}

export function detectScreenshotRows(image: ImagePixels): DetectedScreenshotRow[] {
  const rows: DetectedScreenshotRow[] = []
  for (const band of detectRowBands(image)) {
    const runs = detectCellRuns(image, band)
    if (runs.length < SCREENSHOT_FEEDBACK_FIELDS.length) continue
    const feedbackRuns = runs.slice(-SCREENSHOT_FEEDBACK_FIELDS.length)
    const cells = {} as Record<ScreenshotFeedbackField, DetectedCell>
    SCREENSHOT_FEEDBACK_FIELDS.forEach((field, index) => {
      const run = feedbackRuns[index]
      cells[field] = classifyCell(image, {
        x: run.start,
        y: band.start,
        width: run.end - run.start + 1,
        height: band.end - band.start + 1,
      })
    })
    const first = cells.team
    const inferredNicknameWidth = Math.max(first.width * 1.35, image.width * 0.14)
    const nicknameX = Math.max(0, Math.round(first.x - inferredNicknameWidth - Math.max(3, image.width * 0.006)))
    const nicknameRight = Math.max(nicknameX + 1, first.x - Math.max(2, Math.round(image.width * 0.004)))
    const parsed = feedbackFromCells(image, cells)
    rows.push({
      row: { x: nicknameX, y: band.start, width: feedbackRuns[feedbackRuns.length - 1].end - nicknameX + 1, height: band.end - band.start + 1 },
      nickname: { x: nicknameX, y: band.start, width: nicknameRight - nicknameX, height: band.end - band.start + 1 },
      cells,
      feedback: parsed.feedback,
      includedFields: parsed.includedFields,
      warnings: parsed.warnings,
    })
  }
  return rows.slice(0, 8)
}
