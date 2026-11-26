import { classNames } from '../../utils/format'
import { IconChevronLeft, IconChevronRight } from '../icons'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  itemLabel?: string
}

function pageItems(page: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, 'gap', totalPages]
  if (page >= totalPages - 3) return [1, 'gap', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  return [1, 'gap', page - 1, page, page + 1, 'gap', totalPages]
}

export function Pagination({ page, totalPages, total, limit, onPageChange, itemLabel = 'registros' }: PaginationProps) {
  if (total === 0) return null
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="pagination">
      <p className="pagination-info">
        Mostrando <strong>{from}–{to}</strong> de <strong>{total}</strong> {itemLabel}
      </p>
      <div className="pagination-controls">
        <button
          type="button"
          className="page-btn page-arrow"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <IconChevronLeft size={17} />
        </button>
        {pageItems(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <span key={`gap-${index}`} className="page-gap">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={classNames('page-btn', item === page && 'page-btn-active')}
              onClick={() => onPageChange(item)}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          className="page-btn page-arrow"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Página siguiente"
        >
          <IconChevronRight size={17} />
        </button>
      </div>
    </div>
  )
}
