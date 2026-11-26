import { useEffect, useMemo, useState } from 'react'
import { artworksApi, categoriesApi, subcategoriesApi, artistsApi } from '../api/services'
import type { Artwork, Category, Subcategory, Artist } from '../types'
import { useAuth } from '../auth/AuthContext'

export function UserExplorerPage() {
  const { user } = useAuth()
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [artistId, setArtistId] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) {
      window.location.replace('/login')
      return
    }
    if (user.role !== 'editor') {
      window.location.replace('/admin')
      return
    }
    Promise.all([
      artworksApi.list({ status: 'published', page: 1, limit: 100 }),
      categoriesApi.list({ active: true }),
      subcategoriesApi.list({ active: true }),
      artistsApi.list({ limit: 200 }),
    ]).then(([works, categoryItems, subcategoryItems, artistItems]) => {
      setArtworks(works.data)
      setCategories(categoryItems)
      setSubcategories(subcategoryItems)
      setArtists(artistItems.data)
    })
  }, [user])

  const filtered = useMemo(() => artworks.filter((work) => {
    const text = `${work.title} ${work.artist?.firstName ?? ''} ${work.artist?.lastName ?? ''}`.toLowerCase()
    return (!search || text.includes(search.toLowerCase()))
      && (!categoryId || work.categoryId === categoryId)
      && (!subcategoryId || work.subcategoryId === subcategoryId)
      && (!artistId || work.artistId === artistId)
  }), [artworks, search, categoryId, subcategoryId, artistId])

  return (
    <div className="user-explorer">
      <div className="page-heading">
        <div><span className="eyebrow">Repositorio público</span><h1>Explorar obras</h1></div>
      </div>

      <div className="public-filters">
        <input type="search" placeholder="Buscar obra o artista" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setSubcategoryId('') }}>
          <option value="">Todas las categorías</option>
          {categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
        <select value={subcategoryId} onChange={(event) => setSubcategoryId(event.target.value)}>
          <option value="">Todas las subcategorías</option>
          {subcategories.filter((item) => !categoryId || item.categoryId === categoryId).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
        <select value={artistId} onChange={(event) => setArtistId(event.target.value)}>
          <option value="">Todos los artistas</option>
          {artists.map((item) => <option value={item.id} key={item.id}>{item.firstName} {item.lastName}</option>)}
        </select>
      </div>

      {filtered.length ? (
        <div className="public-art-grid">
          {filtered.map((work) => (
            <article className="public-art-card" key={work.id}>
              <div className="public-art-image">
                {work.coverUrl ? <img src={work.coverUrl} alt={work.title} /> : <span>{work.title.charAt(0)}</span>}
              </div>
              <div className="public-art-body">
                <span className="public-category">{work.category?.name ?? 'Sin categoría'}</span>
                <h3>{work.title}</h3>
                <p>{work.artist ? `${work.artist.firstName} ${work.artist.lastName}` : 'Artista universitario'}</p>
                {work.subcategory && <small>{work.subcategory.name}</small>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="public-empty">No hay obras que coincidan con los filtros.</div>
      )}
    </div>
  )
}
