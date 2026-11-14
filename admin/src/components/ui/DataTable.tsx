import type { ReactNode } from 'react'
import { classNames } from '../../utils/format'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  width?: string
  align?: 'left' | 'right' | 'center'
  className?: string
}

interface DataTableProps<T> {
  columns: Array<Column<T>>
  rows: T[]
  rowKey: (row: T) => string
  loading?: boolean
  empty?: ReactNode
  compact?: boolean
  onRowClick?: (row: T) => void
}

export function DataTable<T>({ columns, rows, rowKey, loading = false, empty, compact = false, onRowClick }: DataTableProps<T>) {
  return (
    <div className="table-wrap">
      <table className={classNames('table', compact && 'table-compact')}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={column.width ? { width: column.width } : undefined}
                className={classNames(column.align && `align-${column.align}`, column.className)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 6 }, (_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="table-skeleton-row">
                  {columns.map((column) => (
                    <td key={column.key}>
                      <span className="skeleton" style={{ width: `${45 + ((rowIndex * 13 + column.key.length * 7) % 45)}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? 'row-clickable' : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={classNames(column.align && `align-${column.align}`, column.className)}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {!loading && rows.length === 0 && empty}
    </div>
  )
}
