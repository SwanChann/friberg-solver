import { useEffect, useRef, useState } from 'react'
import type { PlayerDataset } from '../../data/playerRepository'
import { exportDataset } from '../../data/playerRepository'
import { normalizeSourcePlayers } from '../../data/playerSchema'

interface DatasetInfoProps {
  dataset: PlayerDataset
  onImport: (players: ReturnType<typeof normalizeSourcePlayers>, fileName: string) => void
  onReset: () => void
}

export function DatasetInfo({ dataset, onImport, onReset }: DatasetInfoProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && detailsRef.current?.open) detailsRef.current.open = false
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const importFile = async (file?: File) => {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as unknown
      const raw = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'players' in parsed
        ? (parsed as { players: unknown }).players
        : parsed
      // team_history is optional for local imports. The canonical in-memory shape
      // still uses an empty array so the rule engine has one stable Player type.
      const players = normalizeSourcePlayers(raw)
      onImport(players, file.name)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法读取 JSON')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <details ref={detailsRef} className="dataset-info">
      <summary>
        <span className="dataset-pulse" />
        Dataset v{dataset.metadata.version} · {dataset.players.length} 人
      </summary>
      <div className="dataset-popover">
        <dl>
          <div><dt>Dataset</dt><dd>csgofriberg game database</dd></div>
          <div><dt>Players</dt><dd>{dataset.players.length}</dd></div>
          <div><dt>Snapshot</dt><dd>{dataset.metadata.snapshotDate}</dd></div>
          <div><dt>Version</dt><dd>{dataset.metadata.version}</dd></div>
          <div><dt>Source type</dt><dd>{dataset.metadata.sourceType}</dd></div>
          <div><dt>Source</dt><dd><a href={dataset.metadata.source} target="_blank" rel="noreferrer">查看来源</a></dd></div>
          {dataset.metadata.teamHistoryCoverage && (
            <div><dt>Team history</dt><dd>{dataset.metadata.teamHistoryCoverage}</dd></div>
          )}
          <div><dt>Notes</dt><dd>{dataset.metadata.notes}</dd></div>
        </dl>
        <div className="dataset-actions">
          <button type="button" onClick={() => inputRef.current?.click()}>导入 JSON</button>
          <button type="button" onClick={() => exportDataset(dataset)}>导出 JSON</button>
          <button type="button" className="ghost-button" onClick={onReset}>恢复内置</button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => void importFile(event.target.files?.[0])}
        />
        {error && <pre className="import-error">{error}</pre>}
      </div>
    </details>
  )
}
