import { useId, useState } from 'react'

interface TagInputProps {
  label: string
  values: string[]
  options: string[]
  tone?: 'include' | 'exclude'
  placeholder?: string
  onChange: (values: string[]) => void
}

export function TagInput({
  label,
  values,
  options,
  tone = 'include',
  placeholder = '输入后按 Enter',
  onChange,
}: TagInputProps) {
  const [input, setInput] = useState('')
  const listId = useId()

  const add = () => {
    const next = input.trim()
    if (!next || values.includes(next) || !options.includes(next)) return
    onChange([...values, next])
    setInput('')
  }

  return (
    <div className="tag-input">
      <span className="minor-label">{label}</span>
      <div className="tag-list">
        {values.map((value) => (
          <button
            type="button"
            className={`tag tag-${tone}`}
            key={value}
            onClick={() => onChange(values.filter((item) => item !== value))}
            title={`删除 ${value}`}
          >
            {value} <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>
      <input
        value={input}
        list={listId}
        placeholder={placeholder}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            add()
          }
          if (event.key === 'Escape') setInput('')
        }}
        onBlur={() => {
          if (options.includes(input.trim())) add()
        }}
      />
      <datalist id={listId}>
        {options.filter((option) => !values.includes(option)).map((option) => (
          <option value={option} key={option} />
        ))}
      </datalist>
    </div>
  )
}
