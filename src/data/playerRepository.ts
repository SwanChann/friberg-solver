import bundledMetadata from '../../data/metadata.json'
import bundledPlayers from '../../data/players.json'
import type { DatasetMetadata, Player } from '../domain/player'
import { validatePlayers } from './playerSchema'

const DATASET_STORAGE_KEY = 'friberg-solver:dataset:v1'

export interface PlayerDataset {
  players: Player[]
  metadata: DatasetMetadata
}

export function loadBundledDataset(): PlayerDataset {
  return {
    players: validatePlayers(bundledPlayers),
    metadata: bundledMetadata as DatasetMetadata,
  }
}

export function loadDataset(): PlayerDataset {
  const bundled = loadBundledDataset()
  try {
    const stored = localStorage.getItem(DATASET_STORAGE_KEY)
    if (!stored) return bundled
    const parsed = JSON.parse(stored) as PlayerDataset
    const players = validatePlayers(parsed.players)
    return {
      players,
      metadata: {
        ...parsed.metadata,
        playerCount: players.length,
        sourceType: parsed.metadata.sourceType ?? 'snapshot',
      },
    }
  } catch {
    localStorage.removeItem(DATASET_STORAGE_KEY)
    return bundled
  }
}

export function saveImportedDataset(players: Player[], sourceName: string): PlayerDataset {
  const validated = validatePlayers(players)
  const dataset: PlayerDataset = {
    players: validated,
    metadata: {
      source: sourceName,
      sourceType: 'snapshot',
      snapshotDate: new Date().toISOString().slice(0, 10),
      version: 'local-import',
      playerCount: validated.length,
      retrievedAt: new Date().toISOString(),
      notes: 'User-imported local dataset. Stored only in this browser.',
    },
  }
  localStorage.setItem(DATASET_STORAGE_KEY, JSON.stringify(dataset))
  return dataset
}

export function resetDataset(): PlayerDataset {
  localStorage.removeItem(DATASET_STORAGE_KEY)
  return loadBundledDataset()
}

export function exportDataset(dataset: PlayerDataset): void {
  const blob = new Blob([JSON.stringify(dataset.players, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `friberg-players-${dataset.metadata.snapshotDate}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
