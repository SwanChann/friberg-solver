import { CandidateTable, type SortState } from '../components/CandidateTable/CandidateTable'
import type { Player } from '../domain/player'

interface FilterPageProps {
  candidates: Player[]
  total: number
  sort: SortState
  onSortChange: (sort: SortState) => void
}

export function FilterPage(props: FilterPageProps) {
  return <CandidateTable players={props.candidates} total={props.total} sort={props.sort} onSortChange={props.onSortChange} />
}
