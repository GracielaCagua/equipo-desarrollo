import { IconClose, IconSearch } from '../icons'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…', ariaLabel = 'Buscar' }: SearchInputProps) {
  return (
    <div className="search-input">
      <IconSearch size={18} className="search-icon" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {value && (
        <button type="button" className="search-clear" onClick={() => onChange('')} aria-label="Limpiar búsqueda">
          <IconClose size={14} />
        </button>
      )}
    </div>
  )
}
