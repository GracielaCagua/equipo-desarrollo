import type {
  ActiveStatus,
  Artist,
  ArtistType,
  Artwork,
  ArtworkInput,
  Category,
  DashboardStats,
  MediaFile,
  PublishStatus,
  Subcategory,
  User,
} from '../../types'
import { currentYear } from '../../utils/format'

interface Database {
  categories: Category[]
  subcategories: Subcategory[]
  artists: Artist[]
  artworks: Artwork[]
}

const DB_KEY = 'repositorio-arte-admin-db-v1'

const daysAgo = (days: number): string => new Date(Date.now() - days * 86_400_000).toISOString()

export const DEMO_USERS: Array<{ email: string; password: string; user: User }> = [
  {
    email: 'admin@repositorio.edu.co',
    password: 'admin123',
    user: { id: 'user-admin', name: 'Ana María Ruiz', email: 'admin@repositorio.edu.co', role: 'admin' },
  },
  {
    email: 'editor@repositorio.edu.co',
    password: 'editor123',
    user: { id: 'user-editor', name: 'Carlos Mendoza', email: 'editor@repositorio.edu.co', role: 'editor' },
  },
]

function makeCover(color: string, seed: string): string {
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const x1 = 120 + (hash % 220)
  const y1 = 90 + (hash % 160)
  const x2 = 520 + (hash % 180)
  const y2 = 300 + (hash % 150)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#191428"/></linearGradient><radialGradient id="r" cx="30%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><rect width="800" height="600" fill="url(#g)"/><rect width="800" height="600" fill="url(#r)"/><circle cx="${x1}" cy="${y1}" r="${70 + (hash % 60)}" fill="#f7efe2" opacity="0.16"/><circle cx="${x2}" cy="${y2}" r="${110 + (hash % 80)}" fill="#0f0b1a" opacity="0.22"/><path d="M0 ${430 + (hash % 90)} Q 200 ${330 + (hash % 120)} 400 ${430 + (hash % 70)} T 800 ${380 + (hash % 100)} V600 H0 Z" fill="#0f0b1a" opacity="0.25"/><circle cx="${200 + (hash % 300)}" cy="${160 + (hash % 240)}" r="6" fill="#e8c77b" opacity="0.8"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function seedDatabase(): Database {
  const categories: Category[] = [
    { id: 'cat-pintura', name: 'Pintura', slug: 'pintura', description: 'Obra pictórica sobre lienzo, madera o muro.', color: '#b4533a', active: true, createdAt: daysAgo(420) },
    { id: 'cat-escultura', name: 'Escultura', slug: 'escultura', description: 'Volumen y materia: talla, modelado y ensamblaje.', color: '#6b7d5b', active: true, createdAt: daysAgo(418) },
    { id: 'cat-fotografia', name: 'Fotografía', slug: 'fotografia', description: 'Registro e imagen fotográfica analógica y digital.', color: '#3f6d8e', active: true, createdAt: daysAgo(410) },
    { id: 'cat-videoarte', name: 'Videoarte', slug: 'videoarte', description: 'Imagen en movimiento y experimentación audiovisual.', color: '#6d4b8f', active: true, createdAt: daysAgo(405) },
    { id: 'cat-grabado', name: 'Grabado', slug: 'grabado', description: 'Estampa y matrices: xilografía, litografía y serigrafía.', color: '#a1793c', active: true, createdAt: daysAgo(390) },
    { id: 'cat-ceramica', name: 'Cerámica', slug: 'ceramica', description: 'Arcilla, gres y porcelana transformados por el fuego.', color: '#b56576', active: true, createdAt: daysAgo(380) },
    { id: 'cat-instalacion', name: 'Instalación', slug: 'instalacion', description: 'Espacios, objetos y experiencias en diálogo con el lugar.', color: '#4a5a6a', active: true, createdAt: daysAgo(365) },
    { id: 'cat-arte-digital', name: 'Arte digital', slug: 'arte-digital', description: 'Creación con medios computacionales e interactivos.', color: '#5f5aa8', active: false, createdAt: daysAgo(300) },
  ]

  const subcategories: Subcategory[] = [
    { id: 'sub-oleo', categoryId: 'cat-pintura', name: 'Óleo', slug: 'oleo', description: 'Pintura al óleo sobre soportes tradicionales.', active: true, createdAt: daysAgo(420) },
    { id: 'sub-acrilico', categoryId: 'cat-pintura', name: 'Acrílico', slug: 'acrilico', description: 'Pintura acrílica y técnicas mixtas.', active: true, createdAt: daysAgo(419) },
    { id: 'sub-acuarela', categoryId: 'cat-pintura', name: 'Acuarela', slug: 'acuarela', description: 'Transparencias y veladuras sobre papel.', active: true, createdAt: daysAgo(418) },
    { id: 'sub-mural', categoryId: 'cat-pintura', name: 'Mural', slug: 'mural', description: 'Intervenciones pictóricas de gran formato.', active: true, createdAt: daysAgo(417) },
    { id: 'sub-madera', categoryId: 'cat-escultura', name: 'Madera', slug: 'madera', description: 'Talla y ensamblaje en madera.', active: true, createdAt: daysAgo(416) },
    { id: 'sub-metal', categoryId: 'cat-escultura', name: 'Metal', slug: 'metal', description: 'Forja, soldadura y estructura metálica.', active: true, createdAt: daysAgo(415) },
    { id: 'sub-piedra', categoryId: 'cat-escultura', name: 'Piedra', slug: 'piedra', description: 'Talla directa en piedra natural.', active: true, createdAt: daysAgo(414) },
    { id: 'sub-resina', categoryId: 'cat-escultura', name: 'Resina', slug: 'resina', description: 'Modelado y vaciado en resinas.', active: true, createdAt: daysAgo(413) },
    { id: 'sub-analogica', categoryId: 'cat-fotografia', name: 'Analógica', slug: 'analogica', description: 'Fotografía química y procesos de laboratorio.', active: true, createdAt: daysAgo(412) },
    { id: 'sub-digital', categoryId: 'cat-fotografia', name: 'Digital', slug: 'digital', description: 'Captura y postproducción digital.', active: true, createdAt: daysAgo(411) },
    { id: 'sub-documental', categoryId: 'cat-fotografia', name: 'Documental', slug: 'documental', description: 'Narrativas de lo real y memoria colectiva.', active: true, createdAt: daysAgo(410) },
    { id: 'sub-animacion', categoryId: 'cat-videoarte', name: 'Animación', slug: 'animacion', description: 'Imagen en movimiento construida cuadro a cuadro.', active: true, createdAt: daysAgo(409) },
    { id: 'sub-videoinstalacion', categoryId: 'cat-videoarte', name: 'Video instalación', slug: 'video-instalacion', description: 'Proyección y espacio como soporte.', active: true, createdAt: daysAgo(408) },
    { id: 'sub-cortometraje', categoryId: 'cat-videoarte', name: 'Cortometraje', slug: 'cortometraje', description: 'Narrativa audiovisual de corta duración.', active: true, createdAt: daysAgo(407) },
    { id: 'sub-xilografia', categoryId: 'cat-grabado', name: 'Xilografía', slug: 'xilografia', description: 'Grabado en relieve sobre madera.', active: true, createdAt: daysAgo(406) },
    { id: 'sub-litografia', categoryId: 'cat-grabado', name: 'Litografía', slug: 'litografia', description: 'Estampación sobre matriz calcárea.', active: true, createdAt: daysAgo(405) },
    { id: 'sub-serigrafia', categoryId: 'cat-grabado', name: 'Serigrafía', slug: 'serigrafia', description: 'Estampación a través de malla.', active: true, createdAt: daysAgo(404) },
    { id: 'sub-gres', categoryId: 'cat-ceramica', name: 'Gres', slug: 'gres', description: 'Alta temperatura y pastas chamotadas.', active: true, createdAt: daysAgo(403) },
    { id: 'sub-porcelana', categoryId: 'cat-ceramica', name: 'Porcelana', slug: 'porcelana', description: 'Pasta fina, translúcida y esmaltada.', active: true, createdAt: daysAgo(402) },
    { id: 'sub-raku', categoryId: 'cat-ceramica', name: 'Raku', slug: 'raku', description: 'Cocción rápida y enfriamiento en reducción.', active: true, createdAt: daysAgo(401) },
    { id: 'sub-site', categoryId: 'cat-instalacion', name: 'Site-specific', slug: 'site-specific', description: 'Obras concebidas para un lugar determinado.', active: true, createdAt: daysAgo(400) },
    { id: 'sub-multimedia', categoryId: 'cat-instalacion', name: 'Multimedia', slug: 'multimedia', description: 'Cruces de medios, sonido y tecnología.', active: true, createdAt: daysAgo(399) },
    { id: 'sub-arte-generativo', categoryId: 'cat-arte-digital', name: 'Arte generativo', slug: 'arte-generativo', description: 'Sistemas y algoritmos como material creativo.', active: false, createdAt: daysAgo(398) },
  ]

  const artists: Artist[] = [
    {
      id: 'art-01', firstName: 'Valentina', lastName: 'Restrepo Gómez', email: 'valentina.restrepo@universidad.edu.co',
      phone: '310 456 7812', document: '1025478963', program: 'Artes Plásticas', type: 'student', status: 'active',
      startYear: 2021, bio: 'Explora la memoria del oficio cerámico y las formas del territorio.', createdAt: daysAgo(380),
    },
    {
      id: 'art-02', firstName: 'Santiago', lastName: 'Ospina Ríos', email: 'santiago.ospina@universidad.edu.co',
      phone: '312 884 1290', document: '1012458796', program: 'Artes Plásticas', type: 'graduate', status: 'active',
      startYear: 2016, endYear: 2021, bio: 'Escultor interesado en la relación entre materia, tiempo y paisaje.', createdAt: daysAgo(370),
    },
    {
      id: 'art-03', firstName: 'Camila', lastName: 'Duarte Salcedo', email: 'camila.duarte@universidad.edu.co',
      phone: '301 559 8834', document: '1098765412', program: 'Diseño Visual', type: 'graduate', status: 'active',
      startYear: 2014, endYear: 2019, bio: 'Fotógrafa documental. Trabaja archivos familiares y paisajes intervenidos.', createdAt: daysAgo(360),
    },
    {
      id: 'art-04', firstName: 'Andrés Felipe', lastName: 'Cárdenas', email: 'andres.cardenas@universidad.edu.co',
      phone: '320 771 4467', document: '1032458791', program: 'Artes Plásticas', type: 'student', status: 'active',
      startYear: 2022, bio: 'Trabaja el metal y la escultura cinética desde el desecho industrial.', createdAt: daysAgo(340),
    },
    {
      id: 'art-05', firstName: 'Luisa Fernanda', lastName: 'Mejía', email: 'luisa.mejia@universidad.edu.co',
      phone: '317 221 9087', document: '1029987451', program: 'Artes Plásticas', type: 'graduate', status: 'active',
      startYear: 2015, endYear: 2020, bio: 'Grabadora y pintora. Su obra indaga por los paisajes domésticos.', createdAt: daysAgo(330),
    },
    {
      id: 'art-06', firstName: 'Mateo', lastName: 'Villalba Cruz', email: 'mateo.villalba@universidad.edu.co',
      phone: '318 664 3321', document: '1007854123', program: 'Medios Audiovisuales', type: 'student', status: 'active',
      startYear: 2020, bio: 'Realiza videoarte y animación experimental con archivos encontrados.', createdAt: daysAgo(310),
    },
    {
      id: 'art-07', firstName: 'Isabella', lastName: 'Torres Navia', email: 'isabella.torres@universidad.edu.co',
      phone: '314 009 5562', document: '1014569872', program: 'Diseño Industrial', type: 'graduate', status: 'active',
      startYear: 2017, endYear: 2022, bio: 'Diseñadora e instaladora. Le interesan los objetos y sus rituales.', createdAt: daysAgo(300),
    },
    {
      id: 'art-08', firstName: 'Daniel Esteban', lastName: 'Rojas', email: 'daniel.rojas@universidad.edu.co',
      phone: '311 443 7890', document: '1047851236', program: 'Artes Plásticas', type: 'student', status: 'active',
      startYear: 2023, bio: 'Pintor. Investiga el color y la ciudad como paisaje emocional.', createdAt: daysAgo(240),
    },
    {
      id: 'art-09', firstName: 'Sara Lucía', lastName: 'Benavides', email: 'sara.benavides@universidad.edu.co',
      phone: '300 118 4456', document: '1011223344', program: 'Artes Plásticas', type: 'graduate', status: 'active',
      startYear: 2013, endYear: 2018, bio: 'Artista visual y docente. Trabaja con fotografía y memoria del agua.', createdAt: daysAgo(220),
    },
    {
      id: 'art-10', firstName: 'Julián David', lastName: 'Muñoz', email: 'julian.munoz@universidad.edu.co',
      phone: '319 550 1278', document: '1005441122', program: 'Artes Visuales', type: 'student', status: 'inactive',
      startYear: 2021, bio: 'Interesado en el dibujo expandido y la gráfica popular.', createdAt: daysAgo(200),
    },
    {
      id: 'art-11', firstName: 'Mariana', lastName: 'Gómez Arango', email: 'mariana.gomez@universidad.edu.co',
      phone: '321 667 8890', document: '1022334455', program: 'Artes Plásticas', type: 'graduate', status: 'active',
      startYear: 2018, endYear: 2023, bio: 'Ceramista. Sus piezas parten de la relación entre cuerpo y arcilla.', createdAt: daysAgo(180),
    },
  ]

  const cover = (color: string, title: string) => makeCover(color, title)
  const media = (name: string, color: string, title: string): MediaFile[] => [
    { id: `media-${title.replace(/\s+/g, '-').toLowerCase()}`, name, type: 'image/svg+xml', size: 28_000, kind: 'image', url: cover(color, title) },
  ]

  const artwork = (data: Partial<Artwork> & {
    id: string
    title: string
    description: string
    categoryId: string
    subcategoryId: string
    artistId: string
    color: string
    publishedAt: string
  }): Artwork => {
    const { color, publishedAt, ...rest } = data
    const category = categories.find((item) => item.id === data.categoryId)
    const base: Artwork = {
      id: data.id,
      title: data.title,
      slug: data.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description: data.description,
      year: data.year ?? 2024,
      technique: data.technique ?? '',
      dimensions: data.dimensions ?? '',
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      artistId: data.artistId,
      status: data.status ?? 'draft',
      sold: data.sold ?? false,
      featured: data.featured ?? false,
      coverUrl: cover(color, data.title),
      media: media(`${data.title.toLowerCase().replace(/\s+/g, '-')}.jpg`, color, data.title),
      createdAt: publishedAt,
      updatedAt: publishedAt,
    }
    void category
    return { ...base, ...rest, coverUrl: cover(color, data.title) }
  }

  const artworks: Artwork[] = [
    artwork({
      id: 'work-01', title: 'Raíces de barro', categoryId: 'cat-ceramica', subcategoryId: 'sub-raku', artistId: 'art-01', color: '#b56576',
      description: 'Una serie de piezas que nacen del encuentro entre la arcilla y las huellas de las manos. Cada vasija conserva la irregularidad del gesto y la memoria del fuego.',
      year: 2024, technique: 'Gres esmaltado y raku', dimensions: '32 × 28 × 24 cm', status: 'published', featured: true, publishedAt: daysAgo(4),
    }),
    artwork({
      id: 'work-02', title: 'Silencio en tres tiempos', categoryId: 'cat-pintura', subcategoryId: 'sub-oleo', artistId: 'art-09', color: '#b4533a',
      description: 'Tres lienzos que construyen un mismo paisaje a distintas horas del día. La pintura se diluye hasta dejar apenas la vibración del color sobre la tela.',
      year: 2023, technique: 'Óleo sobre lino', dimensions: '120 × 80 cm (tríptico)', status: 'published', publishedAt: daysAgo(7),
    }),
    artwork({
      id: 'work-03', title: 'Cartografía del destierro', categoryId: 'cat-fotografia', subcategoryId: 'sub-documental', artistId: 'art-03', color: '#3f6d8e',
      description: 'Un archivo fotográfico sobre familias que tuvieron que abandonar sus territorios. Las imágenes se acompañan de mapas dibujados de memoria.',
      year: 2022, technique: 'Fotografía documental', dimensions: '50 × 70 cm', status: 'published', publishedAt: daysAgo(10),
    }),
    artwork({
      id: 'work-04', title: 'Cuerpo de agua', categoryId: 'cat-videoarte', subcategoryId: 'sub-videoinstalacion', artistId: 'art-06', color: '#6d4b8f',
      description: 'Videoinstalación de tres canales que registra el movimiento del agua en una quebrada del oriente antioqueño. El sonido fue grabado in situ.',
      year: 2024, technique: 'Videoinstalación 3 canales', dimensions: 'Duración 8:42 min', status: 'published', featured: true, publishedAt: daysAgo(12),
    }),
    artwork({
      id: 'work-05', title: 'Memoria de la piedra', categoryId: 'cat-escultura', subcategoryId: 'sub-piedra', artistId: 'art-02', color: '#6b7d5b',
      description: 'Talla directa en piedra caliza. La pieza conserva marcas de herramientas y superficies sin pulir que aluden al paso del tiempo.',
      year: 2021, technique: 'Talla directa en caliza', dimensions: '90 × 45 × 38 cm', status: 'published', publishedAt: daysAgo(15),
    }),
    artwork({
      id: 'work-06', title: 'Herbario imaginario', categoryId: 'cat-grabado', subcategoryId: 'sub-xilografia', artistId: 'art-05', color: '#a1793c',
      description: 'Serie de xilografías que inventan una flora imposible. Cada estampa combina especies reales con formas que solo existen en el recuerdo.',
      year: 2023, technique: 'Xilografía sobre papel de algodón', dimensions: '40 × 30 cm', status: 'published', publishedAt: daysAgo(18),
    }),
    artwork({
      id: 'work-07', title: 'Tránsitos', categoryId: 'cat-instalacion', subcategoryId: 'sub-site', artistId: 'art-07', color: '#4a5a6a',
      description: 'Instalación site-specific compuesta por bancas, luces y sonidos que reconstruyen los recorridos cotidianos de un campus universitario.',
      year: 2024, technique: 'Instalación site-specific', dimensions: 'Dimensiones variables', status: 'draft', publishedAt: daysAgo(20),
    }),
    artwork({
      id: 'work-08', title: 'Óxido y memoria', categoryId: 'cat-escultura', subcategoryId: 'sub-metal', artistId: 'art-04', color: '#6b7d5b',
      description: 'Escultura construida con piezas de maquinaria en desuso. El óxido se asume como material y como archivo del trabajo industrial.',
      year: 2023, technique: 'Ensamblaje en hierro oxidado', dimensions: '150 × 80 × 60 cm', status: 'published', publishedAt: daysAgo(24),
    }),
    artwork({
      id: 'work-09', title: 'Ritual de la luz', categoryId: 'cat-fotografia', subcategoryId: 'sub-analogica', artistId: 'art-09', color: '#3f6d8e',
      description: 'Fotografías analógicas realizadas en el interior de una casa en ruinas. La luz atraviesa las grietas y dibuja el paso del tiempo.',
      year: 2022, technique: 'Fotografía analógica, copia química', dimensions: '30 × 40 cm', status: 'published', publishedAt: daysAgo(28),
    }),
    artwork({
      id: 'work-10', title: 'Devorar el paisaje', categoryId: 'cat-pintura', subcategoryId: 'sub-acrilico', artistId: 'art-08', color: '#b4533a',
      description: 'Pinturas de gran formato donde la ciudad se mezcla con formas orgánicas. Una reflexión sobre el crecimiento urbano y sus excesos.',
      year: 2024, technique: 'Acrílico sobre madera', dimensions: '180 × 140 cm', status: 'draft', publishedAt: daysAgo(31),
    }),
    artwork({
      id: 'work-11', title: 'Frecuencia cardíaca', categoryId: 'cat-videoarte', subcategoryId: 'sub-animacion', artistId: 'art-06', color: '#6d4b8f',
      description: 'Animación experimental construida a partir de electrocardiogramas y dibujos escaneados. El ritmo del corazón se vuelve paisaje.',
      year: 2023, technique: 'Animación 2D y archivo', dimensions: 'Duración 4:18 min', status: 'published', publishedAt: daysAgo(34),
    }),
    artwork({
      id: 'work-12', title: 'Vasijas del origen', categoryId: 'cat-ceramica', subcategoryId: 'sub-gres', artistId: 'art-11', color: '#b56576',
      description: 'Conjunto de vasijas de gres que retoman formas precolombinas desde una mirada contemporánea. Cada pieza fue modelada a mano.',
      year: 2023, technique: 'Gres modelado a mano', dimensions: '25 × 20 × 20 cm (c/u)', status: 'published', sold: true, publishedAt: daysAgo(38),
    }),
    artwork({
      id: 'work-13', title: 'Habitar el vacío', categoryId: 'cat-instalacion', subcategoryId: 'sub-multimedia', artistId: 'art-07', color: '#4a5a6a',
      description: 'Instalación multimedia sobre la ausencia y los espacios que quedan cuando una casa se abandona. Incluye proyección y objetos encontrados.',
      year: 2022, technique: 'Instalación multimedia', dimensions: 'Dimensiones variables', status: 'archived', publishedAt: daysAgo(45),
    }),
    artwork({
      id: 'work-14', title: 'Aguas turbias', categoryId: 'cat-fotografia', subcategoryId: 'sub-digital', artistId: 'art-03', color: '#3f6d8e',
      description: 'Serie fotográfica sobre ríos contaminados por la minería. Las imágenes fueron tomadas durante tres años de recorridos por el Bajo Cauca.',
      year: 2024, technique: 'Fotografía digital', dimensions: '60 × 90 cm', status: 'published', sold: true, publishedAt: daysAgo(50),
    }),
    artwork({
      id: 'work-15', title: 'La casa de los susurros', categoryId: 'cat-pintura', subcategoryId: 'sub-oleo', artistId: 'art-05', color: '#b4533a',
      description: 'Pintura de interiores domésticos donde la penumbra y los objetos cotidianos construyen una atmósfera de intimidad y extrañeza.',
      year: 2021, technique: 'Óleo sobre tela', dimensions: '100 × 80 cm', status: 'published', sold: true, publishedAt: daysAgo(55),
    }),
    artwork({
      id: 'work-16', title: 'Grabado sonoro', categoryId: 'cat-grabado', subcategoryId: 'sub-serigrafia', artistId: 'art-05', color: '#a1793c',
      description: 'Serigrafías que traducen ondas de sonido a imagen. Cada estampa corresponde a una grabación de campo realizada en la ciudad.',
      year: 2024, technique: 'Serigrafía sobre papel', dimensions: '50 × 70 cm', status: 'draft', publishedAt: daysAgo(58),
    }),
    artwork({
      id: 'work-17', title: 'Fragmentos de ciudad', categoryId: 'cat-pintura', subcategoryId: 'sub-mural', artistId: 'art-08', color: '#b4533a',
      description: 'Mural realizado en una fachada del barrio. Las formas geometrizan los recorridos de los habitantes y sus oficios.',
      year: 2022, technique: 'Mural en pintura acrílica', dimensions: '8 × 4 m', status: 'archived', publishedAt: daysAgo(62),
    }),
    artwork({
      id: 'work-18', title: 'Nudo infinito', categoryId: 'cat-escultura', subcategoryId: 'sub-madera', artistId: 'art-04', color: '#6b7d5b',
      description: 'Escultura en madera laminada que se retuerce sobre sí misma. La pieza invita a recorrerla y a perder la noción del inicio y el final.',
      year: 2024, technique: 'Madera laminada y ensamble', dimensions: '70 × 70 × 70 cm', status: 'published', publishedAt: daysAgo(66),
    }),
    artwork({
      id: 'work-19', title: 'Video carta a mi madre', categoryId: 'cat-videoarte', subcategoryId: 'sub-cortometraje', artistId: 'art-06', color: '#6d4b8f',
      description: 'Cortometraje íntimo construido con videos familiares y una carta leída en voz alta. Un retrato de la migración y el afecto a distancia.',
      year: 2024, technique: 'Video digital', dimensions: 'Duración 6:05 min', status: 'draft', publishedAt: daysAgo(70),
    }),
    artwork({
      id: 'work-20', title: 'Bosque quemado', categoryId: 'cat-fotografia', subcategoryId: 'sub-documental', artistId: 'art-09', color: '#3f6d8e',
      description: 'Fotografías de un bosque después de un incendio. La serie busca mostrar la vida que persiste entre los troncos carbonizados.',
      year: 2023, technique: 'Fotografía documental', dimensions: '70 × 100 cm', status: 'published', featured: true, publishedAt: daysAgo(75),
    }),
  ]

  return { categories, subcategories, artists, artworks }
}

export function loadDb(): Database {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Database
      if (Array.isArray(parsed.categories) && Array.isArray(parsed.artworks)) return parsed
    }
  } catch {
    // Si el contenido está corrupto se regenera la base de demostración.
  }
  const seeded = seedDatabase()
  persistDb(seeded)
  return seeded
}

export function persistDb(db: Database): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    throw new Error('El almacenamiento local está lleno. Elimina imágenes de obras anteriores o usa el backend real.')
  }
}

export function resetDb(): Database {
  localStorage.removeItem(DB_KEY)
  return loadDb()
}

export function newId(prefix: string): string {
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
  return `${prefix}-${random}`
}

export function graduateArtist(artist: Artist, endYear?: number): Artist {
  return {
    ...artist,
    type: 'graduate',
    status: 'active',
    endYear: endYear ?? artist.endYear ?? currentYear(),
  }
}

export type { Database, ActiveStatus, ArtistType, PublishStatus, ArtworkInput }
