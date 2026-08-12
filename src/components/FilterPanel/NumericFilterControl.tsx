import type { NumericFilter, NumericOperator } from '../../domain/constraint'

interface NumericFilterControlProps {
  label: string
  filter: NumericFilter
  onChange: (filter: NumericFilter) => void
}

const operators: Array<{ value: NumericOperator; label: string }> = [
  { value: 'any', label: '任意' },
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: '<', label: '<' },
  { value: '<=', label: '<=' },
  { value: 'between', label: '区间' },
]

export function NumericFilterControl({ label, filter, onChange }: NumericFilterControlProps) {
  return (
    <div className="numeric-filter">
      <label>{label}</label>
      <div className="numeric-row">
        <select
          aria-label={`${label} 运算符`}
          value={filter.operator}
          onChange={(event) => onChange({ ...filter, operator: event.target.value as NumericOperator })}
        >
          {operators.map((operator) => <option value={operator.value} key={operator.value}>{operator.label}</option>)}
        </select>
        {filter.operator !== 'any' && (
          <input
            type="number"
            aria-label={`${label} 数值`}
            value={filter.value ?? ''}
            onChange={(event) => onChange({
              ...filter,
              value: event.target.value === '' ? null : Number(event.target.value),
            })}
          />
        )}
        {filter.operator === 'between' && (
          <>
            <span>—</span>
            <input
              type="number"
              aria-label={`${label} 上限`}
              value={filter.max ?? ''}
              onChange={(event) => onChange({
                ...filter,
                max: event.target.value === '' ? null : Number(event.target.value),
              })}
            />
          </>
        )}
      </div>
    </div>
  )
}
