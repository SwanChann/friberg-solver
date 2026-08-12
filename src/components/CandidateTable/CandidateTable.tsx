import { Fragment, useState } from 'react'
import type { Player } from '../../domain/player'

export type SortField = 'nickname' | 'nationality' | 'region' | 'age' | 'role' | 'team' | 'major_championships' | 'major_appearances' | 'is_active'

export interface SortState {
  field: SortField
  direction: 'asc' | 'desc'
}

interface CandidateTableProps {
  players: Player[]
  total: number
  sort: SortState
  onSortChange: (sort: SortState) => void
}

const columns: Array<{ field: SortField; label: string }> = [
  { field: 'nickname', label: 'Nickname' },
  { field: 'nationality', label: '国家' },
  { field: 'region', label: '赛区' },
  { field: 'age', label: '年龄' },
  { field: 'role', label: '位置' },
  { field: 'team', label: '当前队伍' },
  { field: 'major_championships', label: '冠军' },
  { field: 'major_appearances', label: '参赛' },
  { field: 'is_active', label: '现役' },
]

export function sortPlayers(players: Player[], sort: SortState): Player[] {
  const direction = sort.direction === 'asc' ? 1 : -1
  return [...players].sort((left, right) => {
    const a = left[sort.field]
    const b = right[sort.field]
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * direction
    if (typeof a === 'boolean' && typeof b === 'boolean') return (Number(a) - Number(b)) * direction
    return String(a).localeCompare(String(b), 'zh-CN', { numeric: true }) * direction
  })
}

export function CandidateTable({ players, total, sort, onSortChange }: CandidateTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const sorted = sortPlayers(players, sort)

  const toggleSort = (field: SortField) => {
    onSortChange({
      field,
      direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc',
    })
  }

  return (
    <section className="candidate-card">
      <div className="candidate-summary">
        <div>
          <span className="eyebrow">LIVE CANDIDATES</span>
          <h2>Matches: <strong>{players.length}</strong> / {total}</h2>
        </div>
        <span className="subtle">点击选手展开详情</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.field}>
                  <button type="button" onClick={() => toggleSort(column.field)}>
                    {column.label} {sort.field === column.field ? (sort.direction === 'asc' ? '↑' : '↓') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((player) => {
              const key = `${player.id ?? ''}:${player.nickname}`
              const isExpanded = expanded === key
              return (
                <Fragment key={key}>
                  <tr className="player-row" onClick={() => setExpanded(isExpanded ? null : key)}>
                    <td><strong>{player.nickname}</strong></td>
                    <td>{player.nationality}</td>
                    <td>{player.region}</td>
                    <td>{player.age}</td>
                    <td>{player.role}</td>
                    <td>{player.team || '—'}</td>
                    <td>{player.major_championships}</td>
                    <td>{player.major_appearances}</td>
                    <td><span className={`status-dot ${player.is_active ? 'active' : ''}`} />{player.is_active ? '是' : '否'}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="detail-row">
                      <td colSpan={columns.length}>
                        <div className="player-detail">
                          <div><span>选手</span><strong>{player.nickname}</strong></div>
                          <div><span>国家 / 赛区</span><strong>{player.nationality} · {player.region}</strong></div>
                          <div><span>年龄 / 位置</span><strong>{player.age} · {player.role}</strong></div>
                          <div><span>当前队伍</span><strong>{player.team || '—'}</strong></div>
                          <div><span>Major</span><strong>{player.major_championships} 冠 / {player.major_appearances} 次</strong></div>
                          <div><span>状态</span><strong>{player.is_active ? '现役' : '非现役'}</strong></div>
                          {player.team_history.length > 0 && (
                            <div className="history-detail">
                              <span>历史队伍（导入数据）</span>
                              <div className="tag-list">
                                {player.team_history.map((team) => <span className="tag tag-neutral" key={team}>{team}</span>)}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {!sorted.length && (
              <tr><td colSpan={columns.length} className="empty-state">没有候选。检查反馈方向或移除一个条件。</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
