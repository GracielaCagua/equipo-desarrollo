import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { IconAlert, IconCheck, IconClose, IconInfo } from '../components/icons'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: ToastKind
  title?: string
  message: string
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string, title?: string) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback<ToastContextValue['push']>(
    (kind, message, title) => {
      counter.current += 1
      const id = counter.current
      setToasts((current) => [...current.slice(-3), { id, kind, message, title }])
      window.setTimeout(() => remove(id), kind === 'error' ? 6500 : 4200)
    },
    [remove],
  )

  const value: ToastContextValue = useMemo(
    () => ({
      push,
      success: (message, title) => push('success', message, title),
      error: (message, title) => push('error', message, title),
      info: (message, title) => push('info', message, title),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="region" aria-live="polite" aria-label="Notificaciones">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.kind}`}>
            <span className="toast-icon">
              {toast.kind === 'success' && <IconCheck size={18} />}
              {toast.kind === 'error' && <IconAlert size={18} />}
              {toast.kind === 'info' && <IconInfo size={18} />}
            </span>
            <div className="toast-content">
              <strong>{toast.title ?? (toast.kind === 'success' ? 'Listo' : toast.kind === 'error' ? 'Algo salió mal' : 'Información')}</strong>
              <p>{toast.message}</p>
            </div>
            <button type="button" className="toast-close" onClick={() => remove(toast.id)} aria-label="Cerrar notificación">
              <IconClose size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return context
}
