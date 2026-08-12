import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { DatasetMetadata } from '../src/domain/player'
import { formatDiff, readPlayers, sha256, stableJson } from './data-utils'

const OFFICIAL_SOURCE = 'https://raw.githubusercontent.com/shnlfriberg/csgo-major-db/main/players.json'
const source = process.env.FRIBERG_DATA_URL ?? OFFICIAL_SOURCE
const apply = process.argv.includes('--apply')
const currentPath = resolve('data/players.json')
const metadataPath = resolve('data/metadata.json')
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'friberg-data-'))
const downloadPath = join(temporaryDirectory, 'players.json')

async function main() {
  const current = readPlayers(currentPath)
  console.log(`Source: ${source}`)
  const response = await fetch(source, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Authoritative dataset unavailable: HTTP ${response.status} ${response.statusText}`)
  const body = await response.text()
  writeFileSync(downloadPath, body, 'utf8')
  const incoming = readPlayers(downloadPath, true, current)
  const content = stableJson(incoming)
  console.log(formatDiff(current, incoming))
  console.log(`SHA-256: ${sha256(content)}`)

  const date = new Date().toISOString().slice(0, 10)
  const candidatePath = resolve(`data-snapshots/candidate-${date}.json`)
  writeFileSync(candidatePath, content, 'utf8')
  console.log(`Validated candidate: ${candidatePath}`)

  if (!apply) {
    console.log('Current dataset was not overwritten. Review the diff, then run: npm run data:update -- --apply')
    return
  }

  const previousMetadata = JSON.parse(readFileSync(metadataPath, 'utf8')) as DatasetMetadata
  const previousPath = resolve(`data-snapshots/pre-update-${date}.json`)
  writeFileSync(previousPath, stableJson(current), 'utf8')
  writeFileSync(currentPath, content, 'utf8')
  const metadata: DatasetMetadata = {
    ...previousMetadata,
    source,
    sourceType: source.includes('shnlfriberg/csgo-major-db') ? 'official' : 'snapshot',
    snapshotDate: date,
    version: response.headers.get('etag')?.replaceAll('"', '') ?? date,
    playerCount: incoming.length,
    retrievedAt: new Date().toISOString(),
    notes: `Validated update applied from ${source}. Previous canonical data saved at ${previousPath}.`,
    sha256: sha256(content),
  }
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
  console.log(`Applied ${incoming.length} players; previous dataset: ${previousPath}`)
}

main().catch((cause) => {
  console.error(cause instanceof Error ? cause.message : cause)
  console.error(`Current dataset preserved: ${currentPath}`)
  process.exitCode = 1
}).finally(() => {
  rmSync(temporaryDirectory, { recursive: true, force: true })
})
