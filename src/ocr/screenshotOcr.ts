import { createWorker, OEM, PSM } from 'tesseract.js'
import type { Player } from '../domain/player'
import { detectScreenshotRows } from './colorAnalysis'
import { chooseNicknameMatch, disambiguateNicknameByNumbers, parseNumericOcr } from './playerMatching'
import type { ImagePixels, ImageRect, ScreenshotGuessDraft } from './types'

export interface OcrProgress {
  progress: number
  status: string
}

export interface ScreenshotOcrResult {
  drafts: ScreenshotGuessDraft[]
  width: number
  height: number
}

function assetPath(path: string): string {
  const base = new URL(import.meta.env.BASE_URL, window.location.href)
  return new URL(path.replace(/^\//, ''), base).href
}

async function decodeImage(file: File): Promise<{
  canvas: HTMLCanvasElement
  pixels: ImagePixels
}> {
  const bitmap = await createImageBitmap(file)
  try {
    if (bitmap.width < 320 || bitmap.height < 180) {
      throw new Error('截图尺寸太小；请上传包含完整猜测表格的清晰截图。')
    }
    if (bitmap.width * bitmap.height > 32_000_000) {
      throw new Error('截图像素过大；请将图片缩小到 3200 万像素以内。')
    }
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('浏览器无法创建图像画布。')
    context.drawImage(bitmap, 0, 0)
    return {
      canvas,
      pixels: {
        width: bitmap.width,
        height: bitmap.height,
        data: context.getImageData(0, 0, bitmap.width, bitmap.height).data,
      },
    }
  } finally {
    bitmap.close()
  }
}

function cornerBackground(data: ImageData): { r: number; g: number; b: number; luminance: number } {
  const samples: Array<[number, number, number]> = []
  const margin = Math.max(2, Math.floor(Math.min(data.width, data.height) * 0.08))
  for (let y = margin; y < data.height - margin; y += Math.max(1, Math.floor(data.height / 12))) {
    for (const x of [margin, data.width - margin - 1]) {
      const offset = (y * data.width + x) * 4
      samples.push([data.data[offset], data.data[offset + 1], data.data[offset + 2]])
    }
  }
  for (let x = margin; x < data.width - margin; x += Math.max(1, Math.floor(data.width / 12))) {
    for (const y of [margin, data.height - margin - 1]) {
      const offset = (y * data.width + x) * 4
      samples.push([data.data[offset], data.data[offset + 1], data.data[offset + 2]])
    }
  }
  samples.sort((left, right) => (
    left[0] + left[1] + left[2]
  ) - (
    right[0] + right[1] + right[2]
  ))
  const [r, g, b] = samples[Math.floor(samples.length / 2)] ?? [255, 255, 255]
  return { r, g, b, luminance: 0.2126 * r + 0.7152 * g + 0.0722 * b }
}

function nicknameCanvas(source: HTMLCanvasElement, rect: ImageRect): HTMLCanvasElement {
  const crop = document.createElement('canvas')
  crop.width = Math.max(1, Math.round(rect.width))
  crop.height = Math.max(1, Math.round(rect.height))
  const cropContext = crop.getContext('2d', { willReadFrequently: true })
  if (!cropContext) throw new Error('浏览器无法预处理昵称区域。')
  cropContext.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, crop.width, crop.height)
  const data = cropContext.getImageData(0, 0, crop.width, crop.height)
  const background = cornerBackground(data)
  const border = Math.max(2, Math.floor(Math.min(data.width, data.height) * 0.05))
  for (let y = 0; y < data.height; y += 1) {
    for (let x = 0; x < data.width; x += 1) {
      const offset = (y * data.width + x) * 4
      const r = data.data[offset]
      const g = data.data[offset + 1]
      const b = data.data[offset + 2]
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const colorDelta = Math.hypot(r - background.r, g - background.g, b - background.b)
      const isBorder = x < border || y < border || x >= data.width - border || y >= data.height - border
      const isForeground = !isBorder && Math.abs(luminance - background.luminance) >= 42 && colorDelta >= 48
      const value = isForeground ? 0 : 255
      data.data[offset] = value
      data.data[offset + 1] = value
      data.data[offset + 2] = value
      data.data[offset + 3] = 255
    }
  }
  cropContext.putImageData(data, 0, 0)

  const scale = Math.max(2, Math.min(4, Math.ceil(150 / crop.height)))
  const padding = 16
  const output = document.createElement('canvas')
  output.width = crop.width * scale + padding * 2
  output.height = crop.height * scale + padding * 2
  const outputContext = output.getContext('2d')
  if (!outputContext) throw new Error('浏览器无法放大昵称区域。')
  outputContext.fillStyle = '#ffffff'
  outputContext.fillRect(0, 0, output.width, output.height)
  outputContext.imageSmoothingEnabled = false
  outputContext.drawImage(crop, padding, padding, crop.width * scale, crop.height * scale)
  return output
}

function cleanOcrText(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/[|`'“”]/g, '')
    .trim()
}

async function recognizeNumber(
  worker: Awaited<ReturnType<typeof createWorker>>,
  source: HTMLCanvasElement,
  rect: ImageRect,
): Promise<{ value?: number; raw: string; confidence: number }> {
  const numberRect = { ...rect, width: Math.max(16, Math.round(rect.width * 0.68)) }
  const result = await worker.recognize(nicknameCanvas(source, numberRect))
  const raw = result.data.text.trim()
  const value = parseNumericOcr(raw)
  const confidence = result.data.confidence / 100
  return value === undefined ? { raw, confidence } : { value, raw, confidence }
}

export async function analyzeScreenshot(
  file: File,
  players: Player[],
  onProgress?: (progress: OcrProgress) => void,
): Promise<ScreenshotOcrResult> {
  if (!file.type.startsWith('image/')) throw new Error('请选择 PNG、JPEG 或 WebP 截图。')
  if (file.size > 20 * 1024 * 1024) throw new Error('截图文件不能超过 20 MB。')
  onProgress?.({ progress: 0.03, status: '正在读取截图' })
  const { canvas, pixels } = await decodeImage(file)
  const rows = detectScreenshotRows(pixels)
  if (!rows.length) {
    throw new Error('没有识别到反馈表格。请保留完整的彩色猜测行，并使用原站标准浅色或深色主题。')
  }
  onProgress?.({ progress: 0.12, status: `已定位 ${rows.length} 行，正在加载本地 OCR` })

  const worker = await createWorker(['eng', 'chi_sim'], OEM.LSTM_ONLY, {
    workerPath: assetPath('ocr/worker.min.js'),
    corePath: assetPath('ocr/core'),
    langPath: assetPath('ocr/tessdata'),
    logger: (message) => {
      if (message.status === 'recognizing text') return
      onProgress?.({
        progress: Math.min(0.34, 0.12 + message.progress * 0.22),
        status: '正在初始化本地 OCR 引擎',
      })
    },
  }, {
    load_system_dawg: '0',
    load_freq_dawg: '0',
  })

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      preserve_interword_spaces: '1',
    })
    const drafts: ScreenshotGuessDraft[] = []
    for (let index = 0; index < rows.length; index += 1) {
      onProgress?.({
        progress: 0.34 + index / rows.length * 0.62,
        status: `正在识别昵称 ${index + 1} / ${rows.length}`,
      })
      const result = await worker.recognize(nicknameCanvas(canvas, rows[index].nickname))
      const rawNickname = cleanOcrText(result.data.text)
      const ocrConfidence = result.data.confidence / 100
      let match = chooseNicknameMatch(rawNickname, players)
      let usedNumericDisambiguation = false
      const warnings = [...rows[index].warnings]
      if (!match.playerNickname && rawNickname) {
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_LINE,
          tessedit_char_whitelist: '',
        })
        const numbers = {
          age: await recognizeNumber(worker, canvas, rows[index].cells.age),
          major_championships: await recognizeNumber(worker, canvas, rows[index].cells.major_championships),
          major_appearances: await recognizeNumber(worker, canvas, rows[index].cells.major_appearances),
        }
        const signature = {
          age: numbers.age.confidence >= 0.6 ? numbers.age.value : undefined,
          major_championships: numbers.major_championships.confidence >= 0.6
            ? numbers.major_championships.value
            : undefined,
          major_appearances: numbers.major_appearances.confidence >= 0.6
            ? numbers.major_appearances.value
            : undefined,
        }
        const disambiguated = ocrConfidence >= 0.5
          ? disambiguateNicknameByNumbers(rawNickname, players, signature)
          : null
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_LINE,
          tessedit_char_whitelist: '',
        })
        if (disambiguated) {
          match = { ...match, playerNickname: disambiguated.nickname, confidence: Math.min(0.94, ocrConfidence) }
          usedNumericDisambiguation = true
          warnings.push('昵称重名，已由至少两项可靠数值完成消歧')
        } else {
          warnings.push('昵称重名或模糊，可靠证据不足，已忽略整行')
        }
      }
      if (match.playerNickname && ocrConfidence < 0.55 && !usedNumericDisambiguation) {
        match = { ...match, playerNickname: '', confidence: Math.min(match.confidence, ocrConfidence) }
      }
      if (!rawNickname) warnings.push('昵称 OCR 为空，已忽略整行')
      else if (!match.playerNickname && !warnings.some((warning) => warning.includes('已忽略整行'))) {
        warnings.push('昵称匹配不确定，已忽略整行')
      }
      drafts.push({
        id: `ocr-${index}-${Date.now()}`,
        rawNickname,
        playerNickname: match.playerNickname,
        nicknameConfidence: match.confidence,
        alternatives: match.alternatives,
        feedback: rows[index].feedback,
        includedFields: rows[index].includedFields,
        warnings,
      })
    }
    onProgress?.({ progress: 1, status: '识别完成，正在自动应用可靠条件' })
    return { drafts, width: pixels.width, height: pixels.height }
  } finally {
    await worker.terminate()
  }
}
