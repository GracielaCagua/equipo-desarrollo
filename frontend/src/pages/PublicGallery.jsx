import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

export function PublicGallery() {
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [artistFilter, setArtistFilter] = useState('');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [artists, setArtists] = useState([]);
  const [works, setWorks] = useState([]);
  const [awards, setAwards] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.categories.list(),
      api.subcategories.list(),
      api.artists.list(),
      api.awards.list(),
      api.exhibitions.list(),
      api.artworks.list({ publication_status: 'published' }),
    ])
      .then(([categoryItems, subcategoryItems, artistItems, awardItems, exhibitionItems, workItems]) => {
        setCategories(categoryItems.filter((item) => item.is_active));
        setSubcategories(subcategoryItems);
        setArtists(artistItems.filter((item) => item.academic_status));
        setAwards(awardItems);
        setExhibitions(exhibitionItems);
        setWorks(Array.isArray(workItems) ? workItems : (workItems.data ?? []));
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleWorks = useMemo(() => works.filter((work) => {
    const text = `${work.title} ${work.artist_name || ''} ${work.category_name || ''}`.toLowerCase();
    const matchesSearch = !search || text.includes(search.toLowerCase());
    const matchesCategory = !category || String(work.category_id) === category;
    const matchesSubcategory = !subcategory || String(work.subcategory_id) === subcategory;
    const matchesArtist = !artistFilter || String(work.artist_id) === artistFilter;
    return matchesSearch && matchesCategory && matchesSubcategory && matchesArtist;
  }), [works, search, category, subcategory, artistFilter]);

  const categorySubcategories = subcategories.filter((item) =>
    !category || String(item.category_id) === category,
  );

  const workImage = (work) => work.files?.find((file) => file.file_type === 'image')?.url;

  return (
    <div className="public-page">
      <header className="public-header">
        <a className="public-brand" href="/" aria-label="Inicio del repositorio">
          <span className="public-brand-mark">G</span>
          <span><strong>Galería universitaria</strong><small>Repositorio de Arte</small></span>
        </a>
        <nav aria-label="Navegación principal">
          <a href="#obras">Obras</a>
          <a href="#artistas">Artistas</a>
          <a href="#premios">Premios</a>
          <a href="#exposiciones">Exposiciones</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <a className="public-admin-link" href="/login">Acceso administrativo</a>
      </header>

      <main>
        <section className="public-hero">
          <div>
            <span className="public-eyebrow">Repositorio universitario</span>
            <h1>Arte, memoria y creación universitaria.</h1>
            <p>Explora obras, categorías, artistas, premios y exposiciones de nuestra comunidad.</p>
          </div>
          <div className="public-hero-art" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>

        <section className="public-explorer" id="obras">
          <div className="public-section-heading">
            <div>
              <span className="public-eyebrow">Colección</span>
              <h2>Explorar obras</h2>
            </div>
            <span>{visibleWorks.length} resultados</span>
          </div>

          <div className="public-filters">
            <input
              type="search"
              placeholder="Buscar obra o artista"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select value={category} onChange={(event) => { setCategory(event.target.value); setSubcategory(''); }}>
              <option value="">Todas las categorías</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={subcategory} onChange={(event) => setSubcategory(event.target.value)}>
              <option value="">Todas las subcategorías</option>
              {categorySubcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={artistFilter} onChange={(event) => setArtistFilter(event.target.value)}>
              <option value="">Todos los artistas</option>
              {artists.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="public-empty">Cargando obras...</div>
          ) : visibleWorks.length ? (
            <div className="public-art-grid">
              {visibleWorks.map((work) => (
                <article className="public-art-card" key={work.id}>
                  <div className="public-art-image">
                    {workImage(work) ? <img src={workImage(work)} alt={work.title} /> : <span>{work.title?.charAt(0)}</span>}
                  </div>
                  <div className="public-art-body">
                    <span className="public-category">{work.category_name || 'Sin categoría'}</span>
                    <h3>{work.title}</h3>
                    <p>{work.artist_name || 'Artista universitario'}</p>
                    {work.subcategory_name && <small>{work.subcategory_name}</small>}
                    {work.commercial_status && (
                      <span className={work.commercial_status === 'sold' ? 'public-sold' : 'public-available'}>
                        {work.commercial_status === 'sold' ? 'Vendida' : 'Disponible'}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="public-empty">No hay obras que coincidan con tu búsqueda.</div>
          )}
        </section>

        <section className="public-two-columns" id="artistas">
          <div>
            <span className="public-eyebrow">Comunidad</span>
            <h2>Estudiantes y graduados</h2>
            <div className="public-artist-grid">
              {artists.map((artist) => (
                <article key={artist.id} className="public-artist">
                  <span>{artist.full_name?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                  <div><strong>{artist.full_name}</strong><small>{artist.academic_status === 'graduate' ? 'Graduado' : 'Estudiante'}</small></div>
                </article>
              ))}
              {!artists.length && <p>No hay artistas registrados.</p>}
            </div>
          </div>
          <div className="public-categories" id="premios">
            <span className="public-eyebrow">Clasificación</span>
            <h2>Categorías</h2>
            {categories.map((item) => (
              <button type="button" key={item.id} onClick={() => { setCategory(String(item.id)); setSubcategory(''); document.querySelector('#obras')?.scrollIntoView({ behavior: 'smooth' }); }}>
                <span>{item.name}</span><strong>Ver obras</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="public-events" id="exposiciones">
          <div className="public-section-heading">
            <div><span className="public-eyebrow">Agenda</span><h2>Premios y exposiciones</h2></div>
          </div>
          <div className="public-event-grid">
            {awards.map((award) => (
              <article key={`award-${award.id}`}><small>Premio</small><h3>{award.name}</h3><p>{award.artist_name}</p><time>{award.award_date}</time></article>
            ))}
            {exhibitions.map((exhibition) => (
              <article key={`exhibition-${exhibition.id}`}><small>Exposición</small><h3>{exhibition.title}</h3><p>{exhibition.location}</p><time>{exhibition.start_date}</time></article>
            ))}
            {!awards.length && !exhibitions.length && <p>No hay eventos registrados.</p>}
          </div>
        </section>

        <section className="public-contact" id="contacto">
          <div><span className="public-eyebrow">Contacto</span><h2>¿Tienes una consulta?</h2><p>Escribe al repositorio universitario.</p></div>
          <a href="mailto:contacto@universidad.edu">Enviar correo</a>
        </section>
      </main>
    </div>
  );
}
