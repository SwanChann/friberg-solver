import { describe, expect, it } from 'vitest'
import { classifyFeedbackColor, detectScreenshotRows } from '../src/ocr/colorAnalysis'
import {
  chooseNicknameMatch,
  disambiguateNicknameByNumbers,
  levenshteinDistance,
  normalizeOcrNickname,
  parseNumericOcr,
} from '../src/ocr/playerMatching'
import type { ImagePixels } from '../src/ocr/types'
import { makePlayer } from './helpers'

function makeImage(width: number, height: number): ImagePixels {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = 248
    data[offset + 1] = 247
    data[offset + 2] = 244
    data[offset + 3] = 255
  }
  return { width, height, data }
}

function setPixel(image: ImagePixels, x: number, y: number, rgb: [number, number, number]) {
  const offset = (y * image.width + x) * 4
  image.data[offset] = rgb[0]
  image.data[offset + 1] = rgb[1]
  image.data[offset + 2] = rgb[2]
  image.data[offset + 3] = 255
}

function fillRect(
  image: ImagePixels,
  x: number,
  y: number,
  width: number,
  height: number,
  rgb: [number, number, number],
) {
  for (let localY = 0; localY < height; localY += 1) {
    for (let localX = 0; localX < width; localX += 1) setPixel(image, x + localX, y + localY, rgb)
  }
}

function drawArrow(image: ImagePixels, x: number, y: number, direction: 'up' | 'down') {
  const white: [number, number, number] = [255, 255, 255]
  const centerX = x + 9
  const top = y + 5
  const bottom = y + 19
  for (let stroke = -1; stroke <= 1; stroke += 1) {
    for (let arrowY = top; arrowY <= bottom; arrowY += 1) setPixel(image, centerX + stroke, arrowY, white)
  }
  const headY = direction === 'up' ? top : bottom
  for (let offset = 0; offset <= 7; offset += 1) {
    const branchY = direction === 'up' ? headY + offset : headY - offset
    for (let stroke = -1; stroke <= 1; stroke += 1) {
      setPixel(image, centerX - offset + stroke, branchY, white)
      setPixel(image, centerX + offset + stroke, branchY, white)
    }
  }
}

function addFeedbackRow(image: ImagePixels, y: number) {
  const cells: Array<{ x: number; width: number; rgb: [number, number, number] }> = [
    { x: 200, width: 100, rgb: [168, 155, 163] },
    { x: 306, width: 90, rgb: [205, 125, 14] },
    { x: 402, width: 58, rgb: [168, 155, 163] },
    { x: 466, width: 90, rgb: [168, 155, 163] },
    { x: 562, width: 58, rgb: [25, 154, 96] },
    { x: 626, width: 58, rgb: [205, 125, 14] },
    { x: 690, width: 100, rgb: [25, 154, 96] },
  ]
  for (const cell of cells) fillRect(image, cell.x, y, cell.width, 50, cell.rgb)
  drawArrow(image, 402 + 36, y + 13, 'down')
  drawArrow(image, 626 + 36, y + 13, 'up')
}

describe('OCR color and geometry analysis', () => {
  it('recognizes official light and blast feedback colors with small compression drift', () => {
    expect(classifyFeedbackColor(25, 154, 96)?.level).toBe('correct')
    expect(classifyFeedbackColor(211, 145, 45)?.level).toBe('close')
    expect(classifyFeedbackColor(105, 87, 101)?.level).toBe('wrong')
    expect(classifyFeedbackColor(245, 245, 245)).toBeNull()
  })

  it('finds rows, maps seven visible columns, derives region, and reads arrow direction', () => {
    const image = makeImage(800, 280)
    addFeedbackRow(image, 80)
    addFeedbackRow(image, 142)

    const rows = detectScreenshotRows(image)
    expect(rows).toHaveLength(2)
    expect(rows[0].cells.team.level).toBe('wrong')
    expect(rows[0].cells.nationality.level).toBe('close')
    expect(rows[0].feedback.attributes.region.level).toBe('correct')
    expect(rows[0].feedback.attributes.age.direction).toBe('lower')
    expect(rows[0].feedback.attributes.major_championships.direction).toBeNull()
    expect(rows[0].feedback.attributes.major_appearances.direction).toBe('higher')
    expect(rows[0].includedFields).toEqual([
      'team',
      'nationality',
      'age',
      'role',
      'major_championships',
      'major_appearances',
      'is_active',
      'region',
    ])
    expect(rows[0].nickname.x).toBeGreaterThanOrEqual(40)
    expect(rows[0].nickname.x + rows[0].nickname.width).toBeLessThan(200)
  })

  it('discards only a numeric field when its arrow cannot be read reliably', () => {
    const image = makeImage(800, 220)
    addFeedbackRow(image, 80)
    fillRect(image, 430, 80, 30, 50, [168, 155, 163])

    const [row] = detectScreenshotRows(image)
    expect(row.includedFields).not.toContain('age')
    expect(row.includedFields).toContain('role')
    expect(row.warnings).toContain('年龄箭头不确定，已忽略该字段')
  })
})

describe('OCR nickname matching', () => {
  const players = [
    makePlayer({ nickname: 'niko(丹麦)', age: 27, major_championships: 0, major_appearances: 2 }),
    makePlayer({ nickname: 'NiKo（波黑）', age: 29, major_championships: 1, major_appearances: 17 }),
    makePlayer({ nickname: 'Jimpphat' }),
    makePlayer({ nickname: 'staehr' }),
  ]

  it('normalizes translated suffixes and punctuation', () => {
    expect(normalizeOcrNickname(' NiKo（波黑） ')).toBe('niko')
    expect(normalizeOcrNickname("Jimp'phat")).toBe('jimpphat')
    expect(levenshteinDistance('staehr', 'staehx')).toBe(1)
    expect(parseNumericOcr('l')).toBe(1)
    expect(parseNumericOcr('2s')).toBe(25)
    expect(parseNumericOcr('RL')).toBeUndefined()
  })

  it('chooses only strong local-player matches and requires two exact numeric facts for duplicate names', () => {
    expect(chooseNicknameMatch('NiKo（波黑）', players)).toMatchObject({
      playerNickname: 'NiKo（波黑）',
      confidence: 1,
    })
    expect(chooseNicknameMatch('NiKo', players).playerNickname).toBe('')
    expect(disambiguateNicknameByNumbers('NiKo (HER)', players, {
      age: 29,
      major_championships: 1,
      major_appearances: 17,
    })?.nickname).toBe('NiKo（波黑）')
    expect(disambiguateNicknameByNumbers('NiKo', players, { age: 29 })).toBeNull()
    expect(disambiguateNicknameByNumbers('NiKo', players, {
      age: 29,
      major_championships: 0,
    })).toBeNull()
    expect(disambiguateNicknameByNumbers('NiKo', [
      makePlayer({ nickname: 'niko(丹麦)', age: 29 }),
      makePlayer({ nickname: 'NiKo（波黑）', age: 29 }),
    ], { age: 29 })).toBeNull()
    expect(chooseNicknameMatch('niko', [
      makePlayer({ nickname: 'nika' }),
      makePlayer({ nickname: 'niku' }),
    ]).playerNickname).toBe('')
  })
})
