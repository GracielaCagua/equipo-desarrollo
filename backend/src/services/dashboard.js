import { query } from '../db/pool.js';

function mapRecentWork(row) {
  const image = row.files?.find((file) => file.file_type === 'image');
  return {
    id: String(row.id),
    title: row.title,
    slug: row.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ?? '',
    description: row.description ?? '',
    year: new Date(row.created_at).getFullYear(),
    technique: '',
    dimensions: '',
    categoryId: row.category_id ? String(row.category_id) : '',
    subcategoryId: row.subcategory_id ? String(row.subcategory_id) : '',
    artistId: row.artist_id ? String(row.artist_id) : '',
    status: row.publication_status ?? 'draft',
    sold: row.commercial_status === 'sold' || row.is_sold === true,
    featured: false,
    coverUrl: image?.url,
    media: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    artist: row.artist_id ? {
      id: String(row.artist_id),
      firstName: row.artist_first_name ?? '',
      lastName: row.artist_last_name ?? '',
      type: row.academic_status ?? 'student',
      program: '',
    } : undefined,
    category: row.category_id ? {
      id: String(row.category_id),
      name: row.category_name ?? '',
      color: row.category_color ?? '#6d4b8f',
    } : undefined,
  };
}

export async function getDashboardStats() {
  const [artworks, artists, categories, byCategory, recent] = await Promise.all([
    query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE publication_status = 'published')::int AS published,
        COUNT(*) FILTER (WHERE publication_status = 'draft')::int AS draft,
        COUNT(*) FILTER (WHERE publication_status = 'archived')::int AS archived,
        COUNT(*) FILTER (WHERE commercial_status = 'sold' OR is_sold = true)::int AS sold
      FROM works
    `),
    query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE academic_status = 'student')::int AS students,
        COUNT(*) FILTER (WHERE academic_status = 'graduate')::int AS graduates
      FROM artists
    `),
    query(`
      SELECT
        (SELECT COUNT(*)::int FROM categories) AS total,
        (SELECT COUNT(*)::int FROM categories WHERE is_active) AS active,
        (SELECT COUNT(*)::int FROM subcategories) AS subcategories
    `),
    query(`
      SELECT c.id, c.name, COUNT(w.id)::int AS count
      FROM categories c
      LEFT JOIN works w ON w.category_id = c.id
      GROUP BY c.id, c.name
      HAVING COUNT(w.id) > 0
      ORDER BY count DESC, c.name
    `),
    query(`
      SELECT w.*,
             a.first_name AS artist_first_name,
             a.last_name AS artist_last_name,
             a.academic_status,
             c.name AS category_name,
             s.name AS subcategory_name,
             COALESCE((
               SELECT json_agg(json_build_object(
                 'id', f.id, 'file_type', f.file_type, 'url', f.url
               ) ORDER BY f.id)
               FROM work_files f WHERE f.work_id = w.id
             ), '[]'::json) AS files
      FROM works w
      LEFT JOIN artists a ON a.id = w.artist_id
      LEFT JOIN categories c ON c.id = w.category_id
      LEFT JOIN subcategories s ON s.id = w.subcategory_id
      ORDER BY w.updated_at DESC, w.id DESC
      LIMIT 6
    `),
  ]);

  const artworkStats = artworks.rows[0];
  const artistStats = artists.rows[0];
  const categoryStats = categories.rows[0];

  return {
    artworks: {
      total: artworkStats.total,
      published: artworkStats.published,
      draft: artworkStats.draft,
      archived: artworkStats.archived,
      sold: artworkStats.sold,
    },
    artists: {
      total: artistStats.total,
      students: artistStats.students,
      graduates: artistStats.graduates,
      inactive: 0,
    },
    categories: {
      total: categoryStats.total,
      active: categoryStats.active,
      subcategories: categoryStats.subcategories,
    },
    byCategory: byCategory.rows.map((row) => ({
      id: String(row.id),
      name: row.name,
      color: '#6d4b8f',
      count: row.count,
    })),
    recent: recent.rows.map(mapRecentWork),
  };
}
