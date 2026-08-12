import type { ManualFilters } from '../../domain/constraint'
import type { Player, PlayerRole } from '../../domain/player'
import { PLAYER_ROLES } from '../../domain/player'
import { NumericFilterControl } from './NumericFilterControl'
import { TagInput } from './TagInput'

interface FilterPanelProps {
  players: Player[]
  filters: ManualFilters
  onChange: (filters: ManualFilters) => void
  onReset: () => void
}

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))

export function FilterPanel({ players, filters, onChange, onReset }: FilterPanelProps) {
  const regions = unique(players.map((player) => player.region))
  const nationalities = unique(players.map((player) => player.nationality))
  const currentTeams = unique(players.map((player) => player.team))
  const teamsWithHistory = unique(players.flatMap((player) => [player.team, ...player.team_history]))
  const hasTeamHistory = players.some((player) => player.team_history.length > 0)
  const set = <K extends keyof ManualFilters>(key: K, value: ManualFilters[K]) => onChange({ ...filters, [key]: value })

  return (
    <aside className="filter-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">MANUAL FILTERS</span>
          <h2>条件筛选</h2>
        </div>
        <button type="button" className="ghost-button" onClick={onReset}>清空</button>
      </div>

      <label className="field-block">
        <span>选手昵称</span>
        <input
          id="nickname-filter"
          value={filters.nickname}
          placeholder="模糊搜索 · Ctrl+K"
          onChange={(event) => set('nickname', event.target.value)}
        />
      </label>

      <fieldset>
        <legend>赛区</legend>
        <TagInput label="包含" values={filters.regionsInclude} options={regions} onChange={(value) => set('regionsInclude', value)} />
        <TagInput label="排除" tone="exclude" values={filters.regionsExclude} options={regions} onChange={(value) => set('regionsExclude', value)} />
      </fieldset>

      <fieldset>
        <legend>国家或地区</legend>
        <TagInput label="包含" values={filters.nationalitiesInclude} options={nationalities} onChange={(value) => set('nationalitiesInclude', value)} />
        <TagInput label="排除" tone="exclude" values={filters.nationalitiesExclude} options={nationalities} onChange={(value) => set('nationalitiesExclude', value)} />
      </fieldset>

      <fieldset>
        <legend>位置</legend>
        <TagInput
          label="包含"
          values={filters.rolesInclude}
          options={[...PLAYER_ROLES]}
          onChange={(value) => set('rolesInclude', value as PlayerRole[])}
        />
        <TagInput
          label="排除"
          tone="exclude"
          values={filters.rolesExclude}
          options={[...PLAYER_ROLES]}
          onChange={(value) => set('rolesExclude', value as PlayerRole[])}
        />
      </fieldset>

      <fieldset>
        <legend>队伍</legend>
        <TagInput label="当前队伍包含" values={filters.currentTeamsInclude} options={currentTeams} onChange={(value) => set('currentTeamsInclude', value)} />
        <TagInput label="当前队伍排除" tone="exclude" values={filters.currentTeamsExclude} options={currentTeams} onChange={(value) => set('currentTeamsExclude', value)} />
        {hasTeamHistory ? (
          <>
            <TagInput label="曾效力于" values={filters.everTeams} options={teamsWithHistory} onChange={(value) => set('everTeams', value)} />
            <TagInput label="从未效力" tone="exclude" values={filters.neverTeams} options={teamsWithHistory} onChange={(value) => set('neverTeams', value)} />
          </>
        ) : (
          <p className="field-note">当前数据不含历史队伍；本版本仅筛选当前队伍。</p>
        )}
      </fieldset>

      <NumericFilterControl label="年龄" filter={filters.age} onChange={(value) => set('age', value)} />
      <NumericFilterControl label="Major 冠军" filter={filters.majorChampionships} onChange={(value) => set('majorChampionships', value)} />
      <NumericFilterControl label="Major 参赛" filter={filters.majorAppearances} onChange={(value) => set('majorAppearances', value)} />

      <label className="field-block">
        <span>现役状态</span>
        <select value={filters.active} onChange={(event) => set('active', event.target.value as ManualFilters['active'])}>
          <option value="any">任意</option>
          <option value="active">现役</option>
          <option value="inactive">非现役</option>
        </select>
      </label>
    </aside>
  )
}
