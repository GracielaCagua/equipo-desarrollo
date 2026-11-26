/**
 * Repositorio De Arte — backend sin dependencias obligatorias.
 * Node.js 20+ | Persistencia local JSON | Contraseñas PBKDF2 | Sesiones con tokens aleatorios.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DATA_DIR = path.resolve(ROOT, 'backend/data');
const UPLOADS_DIR = path.resolve(ROOT, 'backend/uploads');
const PUBLIC_DIR = path.resolve(ROOT, 'frontend');
const DATA_FILE = path.join(DATA_DIR, 'repositorio.json');
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY = 8 * 1024 * 1024;
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
const safe = (x) => String(x ?? '').trim();
const isEmail = (x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
const bool = (x) => x === true;
const err = (status, message) => Object.assign(new Error(message), { status });

function passwordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.pbkdf2Sync(password, salt, 210000, 32, 'sha256').toString('hex')}`;
}
function passwordMatches(password, hash) {
  if (!hash || !hash.includes(':')) return false;
  const [salt, expected] = hash.split(':');
  const result = passwordHash(password, salt).split(':')[1];
  return crypto.timingSafeEqual(Buffer.from(result, 'hex'), Buffer.from(expected, 'hex'));
}
function seedData() {
  const adminId = uuid();
  const categories = [
    { name: 'Pintura', description: 'Color, composición y expresión pictórica.', sub: ['Abstracción', 'Impresionismo', 'Realismo', 'Arte contemporáneo'] },
    { name: 'Escultura', description: 'Forma, espacio y materialidad.', sub: ['Cerámica', 'Talla', 'Instalación', 'Modelado'] },
    { name: 'Fotografía', description: 'Narrativas e imágenes capturadas.', sub: ['Retrato', 'Documental', 'Paisaje', 'Experimental'] },
    { name: 'Videoarte', description: 'Arte en movimiento y medios digitales.', sub: ['Experimental', 'Animación', 'Documental creativo', 'Videoinstalación'] }
  ];
  const cats = categories.map((c) => ({ id: uuid(), name: c.name, description: c.description, is_active: true, created_at: now() }));
  const subs = categories.flatMap((c, i) => c.sub.map((name) => ({ id: uuid(), name, category_id: cats[i].id, is_active: true, created_at: now() })));
  return {
    version: 1,
    users: [{ id: adminId, username: 'admin', full_name: 'Administrador', email: 'admin@repositorio.local', password_hash: passwordHash('admin123'), role: 'admin', created_at: now() }],
    sessions: [], categories: cats, subcategories: subs, artists: [], works: [], messages: [],
    settings: { contact_email: '', institution: 'Repositorio De Arte' }
  };
}
let db;
if (fs.existsSync(DATA_FILE)) {
  try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (e) { console.error('No se pudo leer la base de datos:', e); process.exit(1); }
} else {
  db = seedData();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}
function save() {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}
function publicUser(u) { return { id: u.id, username: u.username, email: u.email, full_name: u.full_name, role: u.role, created_at: u.created_at }; }
function sessionUser(req) {
  const auth = safe(req.headers.authorization);
  if (!auth.startsWith('Bearer ')) return null;
  const tokenHash = crypto.createHash('sha256').update(auth.slice(7)).digest('hex');
  const session = db.sessions.find(s => s.token_hash === tokenHash && new Date(s.expires_at) > new Date());
  return session ? (db.users.find(u => u.id === session.user_id) || null) : null;
}
function adminOnly(user) { if (!user || user.role !== 'admin') throw err(403, 'Esta acción es exclusiva del administrador.'); }
function loginOnly(user) { if (!user) throw err(401, 'Inicia sesión para continuar.'); }
function findById(collection, id) {
  const found = db[collection].find(x => x.id === id);
  if (!found) throw err(404, 'No se encontró el registro.');
  return found;
}
function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}
function json(res, data, status = 200) { send(res, status, data); }
async function bodyOf(req) {
  let length = 0; const chunks = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > MAX_BODY) throw err(413, 'El archivo o la solicitud supera el límite permitido de 8 MB.');
    chunks.push(chunk);
  }
  if (!length) return {};
  if (!String(req.headers['content-type'] || '').includes('application/json')) throw err(415, 'El contenido debe enviarse como JSON.');
  try { const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error(); return parsed; }
  catch { throw err(400, 'Los datos enviados no son JSON válido.'); }
}
function stringField(o, k, min = 1, max = 160) {
  const s = safe(o[k]);
  if (s.length < min || s.length > max) throw err(400, `El campo ${k} debe tener entre ${min} y ${max} caracteres.`);
  return s;
}
function slugImageData(dataUrl) {
  if (!dataUrl) return null;
  if (typeof dataUrl !== 'string') throw err(400, 'Imagen inválida.');
  const m = /^data:image\/(png|jpeg|jpg|jpn);base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw err(400, 'Solo se admiten imágenes en formato PNG o JPG/JPN.');
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length || buf.length > 5 * 1024 * 1024) throw err(400, 'La imagen debe pesar como máximo 5 MB.');
  const [kind] = m.slice(1);
  const png = buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpg = buf.subarray(0,3).equals(Buffer.from([255,216,255]));
  const valid = (kind === 'png' && png) || ((kind === 'jpeg' || kind === 'jpg' || kind === 'jpn') && (jpg || png));
  if (!valid) throw err(400, 'La imagen no coincide con su formato. Solo se aceptan PNG o JPG/JPN.');
  const ext = kind === 'png' ? 'png' : (kind === 'jpn' ? 'jpn' : 'jpg');
  const filename = `${uuid()}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buf);
  return `/uploads/${filename}`;
}
function slugModelData(dataUrl, format) {
  if (!dataUrl) return null;
  const m = /^data:(?:model\/gltf-binary|model\/gltf\+json|application\/octet-stream|application\/json);base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw err(400, 'El modelo 3D debe enviarse como GLB o glTF válido.');
  const buf = Buffer.from(m[1], 'base64');
  if (!buf.length || buf.length > 30 * 1024 * 1024) throw err(400, 'El modelo 3D debe pesar como máximo 30 MB.');
  if (format === 'glb') {
    if (buf.subarray(0, 4).toString() !== 'glTF' || buf.length < 20) throw err(400, 'El archivo GLB no tiene una firma glTF válida.');
  } else if (format === 'gltf') {
    try {
      const parsed = JSON.parse(buf.toString('utf8'));
      if (parsed.asset?.version !== '2.0' && parsed.asset?.version !== '1.0') throw Error();
    } catch { throw err(400, 'El archivo glTF no contiene JSON válido.'); }
  } else {
    throw err(400, 'Formato 3D no admitido. Usa GLB o glTF.');
  }
  const filename = `${uuid()}.${format}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buf);
  return `/uploads/${filename}`;
}
function disposeImage(url) {
  if (typeof url === 'string' && /^\/uploads\/[a-z0-9-]+\.(jpg|png|webp|gif|bmp|glb|gltf)$/.test(url)) {
    try { fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(url))); } catch {}
  }
}
function checkWorkRelations(b) {
  const artist = findById('artists', safe(b.artist_id));
  const category = findById('categories', safe(b.category_id));
  const sub = findById('subcategories', safe(b.subcategory_id));
  if (sub.category_id !== category.id) throw err(400, 'La subcategoría no corresponde a la categoría seleccionada.');
  return { artist, category, sub };
}
function workView(w) {
  const artist = db.artists.find(a => a.id === w.artist_id);
  const cat = db.categories.find(c => c.id === w.category_id);
  const sub = db.subcategories.find(s => s.id === w.subcategory_id);
  return { ...w, artist_name: artist?.name || 'Artista sin registro', academic_status: artist?.academic_status || 'student', category_name: cat?.name || '', subcategory_name: sub?.name || '' };
}
function catalogWorks(user, query) {
  let works = db.works.filter(w => (user?.role === 'admin' && query.get('all') === '1') || (w.status === 'published' && db.categories.some(c => c.id === w.category_id && c.is_active) && db.subcategories.some(s => s.id === w.subcategory_id && s.is_active)));
  for (const key of ['category_id','subcategory_id','artist_id','sale_status']) {
    if (query.get(key)) works = works.filter(w => String(w[key]) === query.get(key));
  }
  if (query.get('award') === '1') works = works.filter(w => w.has_award);
  if (query.get('exhibited') === '1') works = works.filter(w => w.is_exhibited);
  const search = safe(query.get('search')).toLowerCase();
  if (search) works = works.filter(w => [w.title, w.description, w.award_name, w.exhibition_name, workView(w).artist_name].some(s => String(s || '').toLowerCase().includes(search)));
  return works.map(workView).sort((a,b) => b.created_at.localeCompare(a.created_at));
}
async function notification(message) {
  const recipient = safe(db.settings.contact_email);
  if (!recipient || !process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return 'guardado';
  try {
    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipient, replyTo: message.email,
      subject: `Repositorio De Arte: mensaje de ${message.name}`,
      text: `Nombre: ${message.name}\nCorreo: ${message.email}\nAsunto: ${message.subject}\n\n${message.body}`
    });
    return 'enviado';
  } catch (e) { console.warn('Notificación de correo no enviada:', e.message); return 'guardado'; }
}

async function api(req, res, url, user) {
  const p = url.pathname;
  const method = req.method;
  if (p === '/api/health' && method === 'GET') return json(res, { status: 'ok', app: 'Repositorio De Arte' });
  if (p === '/api/auth/register' && method === 'POST') {
    throw err(403, 'El registro de usuarios está deshabilitado. Solo el administrador puede ingresar.');
  }
  if (p === '/api/auth/login' && method === 'POST') {
    const b = await bodyOf(req);
    const identifier = safe(b.username || b.email).toLowerCase();
    const u = db.users.find(x => x.username.toLowerCase() === identifier || x.email.toLowerCase() === identifier);
    if (!u || typeof b.password !== 'string' || !passwordMatches(b.password, u.password_hash)) throw err(401, 'Usuario o contraseña incorrectos.');
    if (u.role !== 'admin') throw err(403, 'Acceso denegado. Solo el administrador puede ingresar al sistema.');
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 7 * 86400000).toISOString();
    db.sessions = db.sessions.filter(s => new Date(s.expires_at) > new Date());
    db.sessions.push({ user_id: u.id, token_hash: crypto.createHash('sha256').update(token).digest('hex'), expires_at });
    save(); return json(res, { token, user: publicUser(u) });
  }
  if (p === '/api/auth/me' && method === 'GET') { loginOnly(user); return json(res, { user: publicUser(user) }); }
  if (p === '/api/auth/logout' && method === 'POST') {
    loginOnly(user);
    const hash = crypto.createHash('sha256').update(req.headers.authorization.slice(7)).digest('hex');
    db.sessions = db.sessions.filter(s => s.token_hash !== hash); save(); return json(res, { message: 'Sesión cerrada.' });
  }
  if (p === '/api/auth/change-password' && method === 'POST') {
    loginOnly(user); const b = await bodyOf(req);
    if (!passwordMatches(String(b.current_password || ''), user.password_hash)) throw err(400, 'La contraseña actual es incorrecta.');
    if (typeof b.new_password !== 'string' || b.new_password.length < 8) throw err(400, 'La nueva contraseña debe tener al menos 8 caracteres.');
    user.password_hash = passwordHash(b.new_password);
    db.sessions = db.sessions.filter(s => s.user_id !== user.id); save();
    return json(res, { message: 'Contraseña actualizada. Vuelve a iniciar sesión.' });
  }
  if (p === '/api/stats' && method === 'GET') {
    adminOnly(user);
    return json(res, { works: db.works.length, published: db.works.filter(w => w.status === 'published').length, categories: db.categories.length, artists: db.artists.length, students: db.artists.filter(a => a.academic_status === 'student').length, graduates: db.artists.filter(a => a.academic_status === 'graduate').length, awards: db.works.filter(w => w.has_award).length, exhibitions: db.works.filter(w => w.is_exhibited).length, messages: db.messages.filter(m => !m.is_read).length, sold: db.works.filter(w => w.sale_status === 'sold').length });
  }
  if (p === '/api/settings' && method === 'GET') return json(res, { contact_email: db.settings.contact_email, institution: db.settings.institution, smtp_configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) });
  if (p === '/api/settings' && method === 'PUT') {
    adminOnly(user); const b = await bodyOf(req);
    const contact_email = safe(b.contact_email).toLowerCase();
    if (contact_email && !isEmail(contact_email)) throw err(400, 'El correo de contacto no es válido.');
    db.settings.contact_email = contact_email;
    db.settings.institution = stringField(b, 'institution', 2, 120); save();
    return json(res, db.settings);
  }
  if (p === '/api/messages' && method === 'POST') {
    const b = await bodyOf(req);
    const name = stringField(b, 'name', 2, 100), email = stringField(b, 'email', 5, 200), subject = stringField(b, 'subject', 3, 150), body = stringField(b, 'body', 10, 4000);
    if (!isEmail(email)) throw err(400, 'Ingresa un correo válido.');
    const m = { id: uuid(), name, email, subject, body, is_read: false, created_at: now() };
    db.messages.push(m); save();
    const email_status = await notification(m);
    return json(res, { message: 'Mensaje recibido correctamente.', email_status }, 201);
  }
  if (p === '/api/messages' && method === 'GET') { adminOnly(user); return json(res, db.messages.slice().sort((a,b) => b.created_at.localeCompare(a.created_at))); }
  let m = /^\/api\/messages\/([^/]+)$/.exec(p);
  if (m && method === 'PATCH') { adminOnly(user); const msg = findById('messages',m[1]); msg.is_read = bool((await bodyOf(req)).is_read); save(); return json(res,msg); }
  if (m && method === 'DELETE') { adminOnly(user); findById('messages',m[1]); db.messages = db.messages.filter(x => x.id !== m[1]); save(); return json(res,{message:'Mensaje eliminado.'}); }

  if (p === '/api/categories' && method === 'GET') return json(res, db.categories.filter(x => user?.role === 'admin' && url.searchParams.get('all') === '1' || x.is_active));
  if (p === '/api/categories' && method === 'POST') {
    adminOnly(user); const b=await bodyOf(req), name=stringField(b,'name',2,80);
    if(db.categories.some(c=>c.name.toLowerCase()===name.toLowerCase())) throw err(409,'Ya existe esa categoría.');
    const c={id:uuid(),name,description:safe(b.description).slice(0,400),is_active:b.is_active!==false,created_at:now()}; db.categories.push(c); save(); return json(res,c,201);
  }
  m=/^\/api\/categories\/([^/]+)$/.exec(p);
  if(m && (method==='PUT'||method==='PATCH')) {
    adminOnly(user); const c=findById('categories',m[1]), b=await bodyOf(req);
    if(method==='PUT') { const name=stringField(b,'name',2,80); if(db.categories.some(x=>x.id!==c.id&&x.name.toLowerCase()===name.toLowerCase())) throw err(409,'Ya existe esa categoría.'); c.name=name; c.description=safe(b.description).slice(0,400); }
    if(typeof b.is_active==='boolean') c.is_active=b.is_active;
    save(); return json(res,c);
  }
  if(m && method==='DELETE') { adminOnly(user); findById('categories',m[1]); if(db.subcategories.some(s=>s.category_id===m[1])||db.works.some(w=>w.category_id===m[1]))throw err(409,'Tiene subcategorías u obras. Desactívala en lugar de eliminarla.'); db.categories=db.categories.filter(x=>x.id!==m[1]);save();return json(res,{message:'Categoría eliminada.'}); }

  if (p === '/api/subcategories' && method === 'GET') return json(res, db.subcategories.filter(x=> ((user?.role==='admin'&&url.searchParams.get('all')==='1') || x.is_active) && (!url.searchParams.get('category_id')||x.category_id===url.searchParams.get('category_id'))));
  if (p === '/api/subcategories' && method === 'POST') {
    adminOnly(user); const b=await bodyOf(req),name=stringField(b,'name',2,80),category_id=safe(b.category_id);findById('categories',category_id);
    if(db.subcategories.some(s=>s.category_id===category_id&&s.name.toLowerCase()===name.toLowerCase()))throw err(409,'Ya existe esa subcategoría en esta categoría.');
    const s={id:uuid(),name,category_id,is_active:b.is_active!==false,created_at:now()};db.subcategories.push(s);save();return json(res,s,201);
  }
  m=/^\/api\/subcategories\/([^/]+)$/.exec(p);
  if(m && (method==='PUT'||method==='PATCH')) {
    adminOnly(user);const s=findById('subcategories',m[1]),b=await bodyOf(req);
    if(method==='PUT'){const name=stringField(b,'name',2,80), category_id=safe(b.category_id);findById('categories',category_id);if(db.works.some(w=>w.subcategory_id===s.id&&w.category_id!==category_id))throw err(409,'No puedes mover una subcategoría con obras vinculadas a otra categoría.');if(db.subcategories.some(x=>x.id!==s.id&&x.category_id===category_id&&x.name.toLowerCase()===name.toLowerCase()))throw err(409,'Ya existe esa subcategoría.');s.name=name;s.category_id=category_id;}
    if(typeof b.is_active==='boolean')s.is_active=b.is_active;save();return json(res,s);
  }
  if(m && method==='DELETE'){adminOnly(user);findById('subcategories',m[1]);if(db.works.some(w=>w.subcategory_id===m[1]))throw err(409,'Esta subcategoría tiene obras vinculadas.');db.subcategories=db.subcategories.filter(x=>x.id!==m[1]);save();return json(res,{message:'Subcategoría eliminada.'});}

  if(p==='/api/artists'&&method==='GET') {
    let artists=db.artists.slice();const q=safe(url.searchParams.get('search')).toLowerCase();
    if(q)artists=artists.filter(a=>[a.name,a.program,a.biography].some(s=>String(s||'').toLowerCase().includes(q)));
    if(url.searchParams.get('academic_status'))artists=artists.filter(a=>a.academic_status===url.searchParams.get('academic_status'));
    return json(res,artists.sort((a,b)=>a.name.localeCompare(b.name)));
  }
  if(p==='/api/artists'&&method==='POST') {
    adminOnly(user);const b=await bodyOf(req),name=stringField(b,'name',2,120);
    if(!['student','graduate'].includes(b.academic_status))throw err(400,'Selecciona estudiante o graduado.');
    const a={id:uuid(),name,academic_status:b.academic_status,program:safe(b.program).slice(0,140),biography:safe(b.biography).slice(0,2000),created_at:now()};db.artists.push(a);save();return json(res,a,201);
  }
  m=/^\/api\/artists\/([^/]+)$/.exec(p);
  if(m && (method==='PUT'||method==='PATCH')) {
    adminOnly(user);const a=findById('artists',m[1]),b=await bodyOf(req);
    if(method==='PUT'){a.name=stringField(b,'name',2,120);a.program=safe(b.program).slice(0,140);a.biography=safe(b.biography).slice(0,2000);}
    if(b.academic_status!==undefined){if(!['student','graduate'].includes(b.academic_status))throw err(400,'Estado académico no válido.');a.academic_status=b.academic_status;}
    save();return json(res,a);
  }
  if(m && method==='DELETE'){adminOnly(user);findById('artists',m[1]);if(db.works.some(w=>w.artist_id===m[1]))throw err(409,'El artista tiene obras vinculadas.');db.artists=db.artists.filter(x=>x.id!==m[1]);save();return json(res,{message:'Artista eliminado.'});}

  if(p==='/api/works'&&method==='GET')return json(res,catalogWorks(user,url.searchParams));
  if(p==='/api/works/mine'&&method==='GET') {
    loginOnly(user);
    if(user.role==='admin') return json(res,db.works.map(workView).sort((a,b)=>b.created_at.localeCompare(a.created_at)));
    return json(res,db.works.filter(w=>w.owner_user_id===user.id).map(workView).sort((a,b)=>b.created_at.localeCompare(a.created_at)));
  }
  if(p==='/api/works'&&method==='POST') {
    adminOnly(user);const b=await bodyOf(req);
    checkWorkRelations(b);
    if(!['published','draft'].includes(b.status || 'draft'))throw err(400,'Estado de publicación no válido.');
    if(!['available','sold'].includes(b.sale_status||'available'))throw err(400,'Estado de venta no válido.');
    const artist_id=safe(b.artist_id);
    const modelFormat=safe(b.model_format).toLowerCase();
    const w={id:uuid(),title:stringField(b,'title',2,180),description:safe(b.description).slice(0,4000),artist_id,category_id:safe(b.category_id),subcategory_id:safe(b.subcategory_id),year:safe(b.year).slice(0,4),status:b.status||'draft',sale_status:b.sale_status||'available',is_exhibited:bool(b.is_exhibited),has_award:bool(b.has_award),award_name:safe(b.award_name).slice(0,180),exhibition_name:safe(b.exhibition_name).slice(0,180),image_url:slugImageData(b.image_data),model_url:modelFormat?slugModelData(b.model_data,modelFormat):null,model_format:modelFormat||null,owner_user_id:user.id,created_at:now()};
    db.works.push(w);save();return json(res,workView(w),201);
  }
  m=/^\/api\/works\/([^/]+)$/.exec(p);
  if(m && method==='GET'){const w=findById('works',m[1]);if(user?.role!=='admin' && (w.status!=='published' || !db.categories.some(c=>c.id===w.category_id&&c.is_active) || !db.subcategories.some(s=>s.id===w.subcategory_id&&s.is_active)))throw err(404,'Obra no disponible.');return json(res,workView(w));}
  if(m && (method==='PUT'||method==='PATCH')){
    adminOnly(user);const w=findById('works',m[1]),b=await bodyOf(req);
    if(user.role==='user'&&w.owner_user_id!==user.id)throw err(403,'Solo puedes editar tus propias obras.');
    if(method==='PUT'&&user.role==='user')b.status='draft';
    if(method==='PUT'){
      if(user.role==='user') {
        const ownArtist=db.artists.find(a=>a.owner_user_id===user.id);
        if(ownArtist) b.artist_id=ownArtist.id;
      }
      checkWorkRelations(b);w.title=stringField(b,'title',2,180);w.description=safe(b.description).slice(0,4000);w.artist_id=safe(b.artist_id);w.category_id=safe(b.category_id);w.subcategory_id=safe(b.subcategory_id);w.year=safe(b.year).slice(0,4);w.award_name=safe(b.award_name).slice(0,180);w.exhibition_name=safe(b.exhibition_name).slice(0,180);
    }
    if(user.role==='admin') {
      if(b.status!==undefined){if(!['published','draft'].includes(b.status))throw err(400,'Estado de publicación no válido.');w.status=b.status;}
      if(b.sale_status!==undefined){if(!['available','sold'].includes(b.sale_status))throw err(400,'Estado de venta no válido.');w.sale_status=b.sale_status;}
      if(typeof b.is_exhibited==='boolean')w.is_exhibited=b.is_exhibited;
      if(typeof b.has_award==='boolean')w.has_award=b.has_award;
    } else {
      w.status='draft';
      w.sale_status='available';
      w.is_exhibited=false;
      w.has_award=false;
    }
    if(b.image_data){const old=w.image_url;w.image_url=slugImageData(b.image_data);disposeImage(old);}
    if(b.remove_image===true){disposeImage(w.image_url);w.image_url=null;}
    if(b.model_format!==undefined) {
      const modelFormat=safe(b.model_format).toLowerCase();
      if(b.model_data) {
        disposeImage(w.model_url);
        w.model_url=slugModelData(b.model_data,modelFormat);
        w.model_format=modelFormat;
      } else if(b.remove_model===true) {
        disposeImage(w.model_url);
        w.model_url=null;
        w.model_format=null;
      }
    }
    save();return json(res,workView(w));
  }
  if(m && method==='DELETE'){
    adminOnly(user);const w=findById('works',m[1]);
    disposeImage(w.image_url);disposeImage(w.model_url);db.works=db.works.filter(x=>x.id!==m[1]);save();return json(res,{message:'Obra eliminada.'});
  }
  throw err(404,'Ruta de API no encontrada.');
}
const MIMES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.jpn':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.bmp':'image/bmp','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.ico':'image/x-icon'};
function staticFile(req,res,pathname){
  if (pathname === '/usuario' || pathname === '/login' || pathname === '/admin') pathname = '/';
  let f;
  if(pathname.startsWith('/uploads/')) {
    const name=pathname.slice('/uploads/'.length);
    if(!/^[a-f0-9-]+\.(png|jpg|jpeg|jpn|webp|gif|bmp|glb|gltf)$/.test(name))throw err(404,'Archivo no encontrado.');
    f=path.join(UPLOADS_DIR,name);
  } else {
    const name=pathname==='/'?'index.html':pathname.replace(/^\//,'');
    if(!['index.html','styles.css','app.js','favicon.svg'].includes(name))throw err(404,'Archivo no encontrado.');
    f=path.join(PUBLIC_DIR,name);
  }
  if(!fs.existsSync(f))throw err(404,'Archivo no encontrado.');
  const ext=path.extname(f);
  res.writeHead(200,{'Content-Type':MIMES[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':ext==='.html'?'no-store':'public, max-age=300','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
  if(req.method==='HEAD'){res.end();return;}
  fs.createReadStream(f).pipe(res);
}
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/'))return await api(req,res,url,sessionUser(req));
    if(!['GET','HEAD'].includes(req.method))throw err(405,'Método no permitido.');
    staticFile(req,res,url.pathname);
  }catch(e){
    if(!res.headersSent)send(res,e.status||500,{error:e.status?e.message:'Error inesperado del servidor.'});
    if(!e.status)console.error(e);
  }
});
server.listen(PORT,'0.0.0.0',()=>console.log(`\nRepositorio De Arte disponible en http://localhost:${PORT}\nAdministrador de demostración: admin / admin123\n`));
export { server };
