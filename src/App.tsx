import { useEffect, useMemo, useState } from 'react'
import { DatasetInfo } from './components/DatasetInfo/DatasetInfo'
import { FilterPanel } from './components/FilterPanel/FilterPanel'
import type { SortState } from './components/CandidateTable/CandidateTable'
import {
  loadDataset,
  resetDataset,
  saveImportedDataset,
  type PlayerDataset,
} from './data/playerRepository'
import { defaultSort, persistState, restoreState, type Tab } from './data/sessionState'
import { emptyManualFilters, type ManualFilters } from './domain/constraint'
import type { GuessRecord } from './domain/feedback'
import type { Player } from './domain/player'
import { calculateCandidates } from './engine/candidateEngine'
import { FilterPage } from './pages/FilterPage'
import { SolverPage } from './pages/SolverPage'

function App() {
  const [dataset, setDataset] = useState<PlayerDataset>(() => loadDataset())
  const [initialState] = useState(restoreState)
  const [tab, setTab] = useState<Tab>(initialState.tab)
  const [filters, setFilters] = useState<ManualFilters>(initialState.filters)
  const [guesses, setGuesses] = useState<GuessRecord[]>(initialState.guesses)
  const [sort, setSort] = useState<SortState>(initialState.sort)
  const [sessionRevision, setSessionRevision] = useState(0)
  const hasTeamHistory = useMemo(
    () => dataset.players.some((player) => player.team_history.length > 0),
    [dataset.players],
  )

  const candidates = useMemo(
    () => calculateCandidates(dataset.players, filters, guesses),
    [dataset.players, filters, guesses],
  )

  useEffect(() => {
    persistState({ tab, filters, guesses, sort })
  }, [tab, filters, guesses, sort])

  useEffect(() => {
    if (hasTeamHistory) return
    if (filters.everTeams.length || filters.neverTeams.length) {
      setFilters((current) => ({ ...current, everTeams: [], neverTeams: [] }))
    }
    if (guesses.some((record) => record.feedback.attributes.team.level === 'close')) {
      setGuesses((current) => current.map((record) => ({
        ...record,
        feedback: {
          ...record.feedback,
          attributes: {
            ...record.feedback.attributes,
            team: { level: 'wrong', direction: null },
          },
        },
      })))
    }
  }, [filters.everTeams.length, filters.neverTeams.length, guesses, hasTeamHistory])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault()
        const id = tab === 'solver' ? 'guess-player-search' : 'nickname-filter'
        document.getElementById(id)?.focus()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [tab])

  const resetSession = () => {
    setFilters(emptyManualFilters())
    setGuesses([])
    setSort(defaultSort)
    setSessionRevision((current) => current + 1)
  }

  const importDataset = (players: Player[], fileName: string) => {
    setDataset(saveImportedDataset(players, fileName))
    setGuesses([])
    setSessionRevision((current) => current + 1)
  }

  const restoreBundledDataset = () => {
    setDataset(resetDataset())
    setGuesses([])
    setSessionRevision((current) => current + 1)
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark">F1</span>
          <div>
            <p>csgofriberg companion</p>
            <h1>弗一把 Player Solver</h1>
          </div>
        </div>
        <div className="header-actions">
          <DatasetInfo
            dataset={dataset}
            onImport={importDataset}
            onReset={restoreBundledDataset}
          />
          <button type="button" className="ghost-button" onClick={resetSession}>重置状态</button>
        </div>
      </header>

      <nav className="tabs" aria-label="功能模式">
        <button type="button" className={tab === 'filter' ? 'active' : ''} onClick={() => setTab('filter')}>
          条件筛选 <span>{calculateCandidates(dataset.players, filters, []).length}</span>
        </button>
        <button type="button" className={tab === 'solver' ? 'active' : ''} onClick={() => setTab('solver')}>
          对局推演 <span>{guesses.length}</span>
        </button>
      </nav>

      <main className="workspace-layout">
        <FilterPanel
          players={dataset.players}
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(emptyManualFilters())}
        />
        <div className="workspace-main">
          {tab === 'filter' ? (
            <FilterPage candidates={candidates} total={dataset.players.length} sort={sort} onSortChange={setSort} />
          ) : (
            <SolverPage
              key={sessionRevision}
              players={dataset.players}
              candidates={candidates}
              guesses={guesses}
              sort={sort}
              onSortChange={setSort}
              onGuessesChange={setGuesses}
            />
          )}
        </div>
      </main>
      <footer>
        <span>Local-only · no account · no server database</span>
        <span>Rules verified against upstream commit 33c8288</span>
      </footer>
    </div>
  )
}

export default App
