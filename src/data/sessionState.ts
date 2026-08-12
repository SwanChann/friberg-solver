import type { SortState } from '../components/CandidateTable/CandidateTable'
import { emptyManualFilters, type ManualFilters } from '../domain/constraint'
import type { GuessRecord } from '../domain/feedback'

export type Tab = 'filter' | 'solver'

export interface PersistedState {
  tab: Tab
  filters: ManualFilters
  guesses: GuessRecord[]
  sort: SortState
}

interface StateStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const STATE_KEY = 'friberg-solver:state:v1'
export const defaultSort: SortState = { field: 'nickname', direction: 'asc' }

export function defaultPersistedState(): PersistedState {
  return {
    tab: 'filter',
    filters: emptyManualFilters(),
    guesses: [],
    sort: defaultSort,
  }
}

export function restoreState(storage: StateStorage = localStorage): PersistedState {
  const fallback = defaultPersistedState()
  try {
    const stored = JSON.parse(storage.getItem(STATE_KEY) ?? 'null') as Partial<PersistedState> | null
    if (!stored) return fallback
    const defaults = emptyManualFilters()
    return {
      tab: stored.tab === 'solver' ? 'solver' : 'filter',
      filters: {
        ...defaults,
        ...stored.filters,
        age: { ...defaults.age, ...stored.filters?.age },
        majorChampionships: { ...defaults.majorChampionships, ...stored.filters?.majorChampionships },
        majorAppearances: { ...defaults.majorAppearances, ...stored.filters?.majorAppearances },
      },
      guesses: Array.isArray(stored.guesses) ? stored.guesses : [],
      sort: stored.sort ?? defaultSort,
    }
  } catch {
    storage.removeItem(STATE_KEY)
    return fallback
  }
}

export function persistState(state: PersistedState, storage: StateStorage = localStorage): void {
  storage.setItem(STATE_KEY, JSON.stringify(state))
}
