import { useId, useRef, useState } from 'react'
import type { MediaFile, MediaKind } from '../../types'
import { FILE_RULES } from '../../utils/files'
import { classNames, formatBytes } from '../../utils/format'
import { IconAlert, IconFile, IconImage, IconStar, IconTrash, IconUpload, IconVideo } from '../icons'

interface MediaUploaderProps {
  kind: MediaKind
  items: MediaFile[]
  onAdd: (files: File[]) => void | Promise<void>
  onRemove: (id: string) => void
  onSetCover?: (id: string) => void
  coverId?: string | null
  errors?: string[]
  busy?: boolean
}

export function MediaUploader({ kind, items, onAdd, onRemove, onSetCover, coverId, errors = [], busy = false }: MediaUploaderProps) {
  const rule = FILE_RULES[kind]
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const full = items.length >= rule.max

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return
    void onAdd(Array.from(fileList))
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="uploader">
      <div className="uploader-head">
        <div>
          <h3>{rule.label}</h3>
          <p>{rule.hint}</p>
        </div>
        <span className="uploader-counter">
          {items.length}/{rule.max}
        </span>
      </div>

      <div
        className={classNames('dropzone', dragging && 'dropzone-active', (full || busy) && 'dropzone-disabled')}
        onDragOver={(event) => {
          event.preventDefault()
          if (!full && !busy) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (full || busy) return
          handleFiles(event.dataTransfer.files)
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple={rule.multiple}
          accept={rule.accept.join(',')}
          onChange={(event) => handleFiles(event.target.files)}
          disabled={full || busy}
          className="sr-only"
        />
        <label htmlFor={inputId} className={classNames('dropzone-label', (full || busy) && 'dropzone-label-disabled')}>
          <span className="dropzone-icon">
            <IconUpload size={20} />
          </span>
          <span className="dropzone-text">
            {busy ? 'Procesando archivos…' : full ? 'Límite de archivos alcanzado' : 'Arrastra archivos aquí o haz clic para seleccionar'}
            <small>{rule.acceptLabel} · hasta {rule.maxMB} MB</small>
          </span>
        </label>
      </div>

      {errors.length > 0 && (
        <div className="media-errors" role="alert">
          <IconAlert size={17} />
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {items.length > 0 &&
        (kind === 'image' ? (
          <div className="media-grid">
            {items.map((item) => (
              <figure className={classNames('media-card', coverId === item.id && 'media-card-cover')} key={item.id}>
                <div className="media-thumb">
                  {item.url ? <img src={item.url} alt={item.name} /> : <IconImage size={24} />}
                  {coverId === item.id && (
                    <span className="media-cover-badge">
                      <IconStar size={12} /> Portada
                    </span>
                  )}
                </div>
                <figcaption>
                  <span className="media-name" title={item.name}>{item.name}</span>
                  <span className="media-size">{formatBytes(item.size)}</span>
                </figcaption>
                <div className="media-actions">
                  {onSetCover && coverId !== item.id && (
                    <button
                      type="button"
                      className="icon-btn icon-btn-sm"
                      onClick={() => onSetCover(item.id)}
                      title="Usar como portada"
                      aria-label={`Usar ${item.name} como portada`}
                    >
                      <IconStar size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-btn icon-btn-sm icon-btn-danger"
                    onClick={() => onRemove(item.id)}
                    title="Quitar archivo"
                    aria-label={`Quitar ${item.name}`}
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              </figure>
            ))}
          </div>
        ) : (
          <ul className="file-list">
            {items.map((item) => (
              <li className="file-item" key={item.id}>
                <span className="file-icon">
                  {kind === 'video' ? <IconVideo size={18} /> : <IconFile size={18} />}
                </span>
                <span className="file-info">
                  <strong title={item.name}>{item.name}</strong>
                  <small>{formatBytes(item.size)} · {item.type || 'archivo'}</small>
                </span>
                <button
                  type="button"
                  className="icon-btn icon-btn-sm icon-btn-danger"
                  onClick={() => onRemove(item.id)}
                  title="Quitar archivo"
                  aria-label={`Quitar ${item.name}`}
                >
                  <IconTrash size={15} />
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  )
}
