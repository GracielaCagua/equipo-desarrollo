/* Repositorio De Arte — interfaz sin dependencias, servida por el backend */
const S = {
  token: localStorage.getItem('ra_token') || '', user: null,
  categories: [], subcategories: [], artists: [], works: [], stats: {}, messages: [], settings: {},
  section: 'overview', userSection: 'explore', modal: null, myWorks: [],
  filters: { search: '', category_id: '', subcategory_id: '', academic_status: '', sale_status: '' }
};
const root = document.querySelector('#app');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr = esc;
const shorten = (v, n=110) => String(v || '').length > n ? String(v).slice(0, n).trim() + '…' : (v || '');
const date = v => v ? new Date(v).toLocaleDateString('es-EC', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const label = (v, choices) => choices[v] || v || '—';
const statuses = { student:'Estudiante', graduate:'Graduado', published:'Publicada', draft:'Borrador', sold:'Vendida', available:'No vendida' };
const media = w => w.image_url && /^\/uploads\/[a-z0-9-]+\.(png|jpg|jpeg|jpn)$/.test(w.image_url) ? `<img alt="Obra: ${attr(w.title)}" src="${attr(w.image_url)}" loading="lazy">` : `<div class="thumb-abstract" aria-hidden="true"></div>`;
const tag = (name, type='') => `<span class="tag ${type}">${esc(name)}</span>`;
const pill = (text, variant='') => `<span class="status-pill ${variant}">${esc(text)}</span>`;
function toast(message, isError=false) {
  const node = document.createElement('div'); node.className=`toast ${isError?'error':''}`;
  node.textContent=message; document.querySelector('#toasts').appendChild(node);
  setTimeout(()=>node.remove(),4500);
}
async function request(method, endpoint, body) {
  let response;
  try { response = await fetch(endpoint,{ method,headers:{ ...(body ? {'Content-Type':'application/json'} : {}), ...(S.token ? { Authorization:`Bearer ${S.token}` } : {}) },body:body ? JSON.stringify(body) : undefined }); }
  catch { throw Error('No se pudo conectar con el servidor. Verifica que esté encendido.'); }
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(result.error || 'No se pudo completar la acción.');
  return result;
}
const get = ep => request('GET',ep);
function route() {
  const hashRoute = location.hash.replace(/^#\/?/,'').split('?')[0].replace(/^\//,'');
  if (hashRoute) return hashRoute;
  const pathnameRoute = location.pathname === '/usuario' ? 'usuario'
    : location.pathname === '/admin' ? 'admin'
    : location.pathname === '/login' ? 'login'
    : 'inicio';
  return pathnameRoute;
}
function go(to) {
  if (to === 'registro') {
    to = 'login';
  }
  if (to === 'login') {
    history.replaceState(null,'','/login');
  } else if (to === 'admin') {
    history.replaceState(null,'','/admin');
  } else if (to === 'usuario') {
    history.replaceState(null,'','/usuario');
  } else {
    location.hash='#/'+to;
  }
  render();
  window.scrollTo({top:0,behavior:'instant'});
}
async function loadData() {
  const all=S.user?.role==='admin'?'?all=1':'';
  const [categories,subcategories,artists,works,settings]=await Promise.all([
    get(`/api/categories${all}`),get(`/api/subcategories${all}`),get('/api/artists'),get(`/api/works${all}`),get('/api/settings')
  ]);
  Object.assign(S,{categories,subcategories,artists,works,settings});
  if(S.user?.role==='admin') { const [stats,messages]=await Promise.all([get('/api/stats'),get('/api/messages')]);S.stats=stats;S.messages=messages; }
  if(S.user) S.myWorks=await get('/api/works/mine');
}
async function init(){
  if(S.token){try{S.user=(await get('/api/auth/me')).user;}catch{S.token='';localStorage.removeItem('ra_token');}}
  try{await loadData();}catch(e){toast(e.message,true);}
  render();
}
function brand(light=false){return `<a class="brand" href="#/inicio"><div class="brand-symbol">RA</div><div><div class="brand-name">Repositorio De Arte</div><div class="brand-tag">Archivo creativo</div></div></a>`;}
function siteHeader(){const page=route();return `<header class="site-header"><div class="container header-inner">${brand()}<nav class="top-links" aria-label="Principal">
<a href="#/explorar" class="${page==='explorar'?'active':''}">Explorar obras</a><a href="#/premios" class="${page==='premios'?'active':''}">Premios</a><a href="#/exposiciones" class="${page==='exposiciones'?'active':''}">Exposiciones</a><a href="#/expuestas" class="${page==='expuestas'?'active':''}">Obras expuestas</a><a href="#/contacto" class="${page==='contacto'?'active':''}">Contacto</a></nav><div class="top-actions">${S.user?`<a href="#/${S.user.role==='admin'?'admin':'usuario'}" class="btn btn-outline btn-small">Mi panel</a><button type="button" class="btn btn-ghost btn-small" data-action="logout">Cerrar sesión</button>`:`<a href="#/login" class="btn btn-small">Acceso administrador</a>`}</div></div><nav class="container mobile-nav" aria-label="Secciones"><a href="#/explorar">Explorar</a><a href="#/premios">Premios</a><a href="#/exposiciones">Exposiciones</a><a href="#/expuestas">Obras expuestas</a><a href="#/artistas">Artistas</a><a href="#/contacto">Contacto</a></nav></header>`;}
function footer(){return `<footer class="site-footer"><div class="container footer-inner"><div>${brand()}<small>Una plataforma para conservar, descubrir y celebrar el arte.</small></div><div><a href="#/explorar">Explorar archivo</a> · <a href="#/contacto">Contacto</a><small>© ${new Date().getFullYear()} Repositorio De Arte</small></div></div></footer>`;}
function categoryTiles(){return S.categories.filter(c=>c.is_active).slice(0,4).map((c,i)=>`<a class="category-tile" href="#/explorar" data-action="category" data-id="${attr(c.id)}"><div class="category-shape"></div><span class="category-num">COLECCIÓN 0${i+1}</span><div><h3>${esc(c.name)}</h3><p>${esc(c.description || 'Explora nuevas expresiones artísticas.')}</p><span class="tile-arrow">↗</span></div></a>`).join('');}
function home(){
  const total=S.works.filter(w=>w.status==='published').length;
  return `${siteHeader()}<main><section class="container hero"><div><div class="eyebrow">Arte · Memoria · Comunidad</div><h1>Repositorio <span class="serif">De Arte.</span></h1><p class="hero-copy">Un espacio digital para descubrir las obras, ideas y miradas de estudiantes y graduados. Explora colecciones, exposiciones y talento creativo.</p><div class="hero-cta"><a href="#/explorar" class="btn">Explorar el repositorio <span>↗</span></a>${!S.user?`<a href="#/login" class="btn btn-outline">Acceso administrador</a>`:`<a href="#/${S.user.role==='admin'?'admin':'usuario'}" class="btn btn-outline">Ir a mi panel</a>`}</div><div class="hero-note">Un archivo que crece con cada creación</div></div><div class="hero-art" aria-label="Composición abstracta artística"><div class="art-back"></div><div class="art-main"><div class="art-orbit"></div><div class="art-square"></div><div class="art-circle"></div></div><div class="art-stamp"><strong>EXPRESIÓN SIN LÍMITES</strong><span>Archivo digital de arte</span></div></div></section><section class="section section-light"><div class="container"><div class="section-header"><div><span class="eyebrow">Nuestras disciplinas</span><h2>Explora por categoría</h2></div><p class="section-intro">De la pintura al videoarte. Encuentra obras clasificadas por técnica, estilo y autor.</p></div><div class="category-grid">${categoryTiles() || empty('Aún no hay categorías','El administrador podrá crearlas desde su panel.')}</div></div></section><section class="section"><div class="container"><div class="section-header"><div><span class="eyebrow">Colección digital</span><h2>Obras del repositorio</h2></div><a href="#/explorar" class="btn btn-outline">Ver todas las obras ↗</a></div><div class="works-grid">${S.works.filter(w=>w.status==='published').slice(0,3).map(workCard).join('')||empty('El archivo está por comenzar','Las primeras obras aparecerán aquí en cuanto un administrador las publique.')}</div><div class="stats-strip" style="margin-top:45px"><div class="stat-item"><strong>${total}</strong><span>Obras publicadas</span></div><div class="stat-item"><strong>${S.categories.filter(x=>x.is_active).length}</strong><span>Categorías activas</span></div><div class="stat-item"><strong>${S.artists.filter(x=>x.academic_status==='student').length}</strong><span>Estudiantes artistas</span></div><div class="stat-item"><strong>${S.works.filter(w=>w.status==='published'&&w.is_exhibited).length}</strong><span>Obras expuestas</span></div></div></div></section><section class="section" style="padding-top:0"><div class="container"><div class="feature-banner"><div><span class="eyebrow" style="color:#dcc7a8">Un lugar para la creación</span><h2>Más que obras.<br><span class="serif">Historias que permanecen.</span></h2><p>El talento artístico merece un lugar donde perdurar, conectar e inspirar.</p><a class="btn btn-light" href="#/exposiciones">Ver exposiciones ↗</a></div><div class="feature-art" aria-hidden="true"></div></div></div></section></main>${footer()}`;
}
function empty(title,desc,button=''){return `<div class="empty-state"><div class="empty-art"></div><h3>${esc(title)}</h3><p>${esc(desc)}</p>${button}</div>`;}
function workCard(w){return `<article class="work-card clickable" tabindex="0" role="button" data-action="open-work" data-id="${attr(w.id)}" aria-label="Ver obra ${attr(w.title)}"><div class="work-thumb">${media(w)}<span class="work-label">${esc(w.category_name)}</span></div><div class="work-info"><div class="work-meta"><span>${esc(w.subcategory_name)}</span>${w.year?`<span>${esc(w.year)}</span>`:''}</div><h3>${esc(w.title)}</h3><p>${esc(w.artist_name)} · ${label(w.academic_status,statuses)}</p><div class="tags">${w.has_award?tag('Premio','tag-accent'):''}${w.is_exhibited?tag('En exposición'):''}${w.is_exhibited?tag(label(w.sale_status,statuses),w.sale_status==='sold'?'tag-accent':'tag-success'):''}</div></div></article>`;}
function artistCard(a){const count=S.works.filter(w=>w.artist_id===a.id&&w.status==='published').length;return `<div class="artist-card"><div class="avatar">${esc(a.name.charAt(0).toUpperCase())}</div><div><span class="eyebrow">${esc(label(a.academic_status,statuses))}</span><h3>${esc(a.name)}</h3><p>${esc(a.program||'Artista')} · ${count} obra(s)</p></div></div>`;}
function filteredWorks(kind='explore'){
  let items=S.works.filter(w=>w.status==='published');
  if(kind==='awards')items=items.filter(w=>w.has_award);
  if(kind==='exhibitions'||kind==='exhibited')items=items.filter(w=>w.is_exhibited);
  if(S.filters.search){const q=S.filters.search.toLowerCase();items=items.filter(w=>[w.title,w.artist_name,w.description,w.category_name].some(x=>String(x).toLowerCase().includes(q)));}
  if(S.filters.category_id)items=items.filter(w=>w.category_id===S.filters.category_id);
  if(S.filters.subcategory_id)items=items.filter(w=>w.subcategory_id===S.filters.subcategory_id);
  if(S.filters.academic_status)items=items.filter(w=>w.academic_status===S.filters.academic_status);
  if(S.filters.sale_status && kind==='exhibited')items=items.filter(w=>w.sale_status===S.filters.sale_status);
  return items;
}
function selectOptions(items, value='',emptyLabel='Todas',fields=['id','name']){return `<option value="">${esc(emptyLabel)}</option>${items.map(item=>`<option value="${attr(item[fields[0]])}" ${String(item[fields[0]])===String(value)?'selected':''}>${esc(item[fields[1]])}</option>`).join('')}`;}
function catalogFilters(kind='explore'){
  const sub=S.subcategories.filter(s=>s.is_active&&(!S.filters.category_id||s.category_id===S.filters.category_id));
  return `<div class="filters"><input class="input" id="catalog-search" aria-label="Buscar obras" placeholder="⌕  Buscar obra o artista..." value="${attr(S.filters.search)}"><select class="select" data-filter="category_id" aria-label="Categoría">${selectOptions(S.categories.filter(c=>c.is_active),S.filters.category_id,'Todas las categorías')}</select><select class="select" data-filter="subcategory_id" aria-label="Subcategoría">${selectOptions(sub,S.filters.subcategory_id,'Todas las subcategorías')}</select><select class="select" data-filter="academic_status" aria-label="Estado académico"><option value="">Estudiantes y graduados</option><option value="student" ${S.filters.academic_status==='student'?'selected':''}>Estudiantes</option><option value="graduate" ${S.filters.academic_status==='graduate'?'selected':''}>Graduados</option></select>${kind==='exhibited'?`<select class="select" data-filter="sale_status" aria-label="Estado de venta"><option value="">Vendidas y no vendidas</option><option value="available" ${S.filters.sale_status==='available'?'selected':''}>No vendidas</option><option value="sold" ${S.filters.sale_status==='sold'?'selected':''}>Vendidas</option></select>`:''}</div>`;
}
function catalogContent(kind='explore'){
  const works=filteredWorks(kind);
  return `${catalogFilters(kind)}<div class="filterbar"><span class="small" id="results-count">${works.length} resultado(s)</span><button class="btn btn-ghost btn-small" data-action="clear-filters">Limpiar filtros ×</button></div><div class="works-grid" id="catalog-list">${works.map(workCard).join('')||empty('No se encontraron obras','Prueba con otra categoría o consulta más adelante.')}</div>`;
}
const descriptions={explore:['Explorar obras','Descubre el talento detrás de cada creación. Filtra por disciplina, subcategoría o trayectoria del artista.'],awards:['Premios y reconocimientos','Obras reconocidas por su creatividad, investigación y excelencia artística.'],exhibitions:['Exposiciones','Una selección de obras presentadas en exposiciones y muestras.'],exhibited:['Obras expuestas','Consulta obras expuestas y descubre cuáles están vendidas o no vendidas.']};
function publicCatalog(kind){const [title,description]=descriptions[kind];return `${siteHeader()}<main class="container"><div class="page-hero"><div class="eyebrow">Galería digital / Colecciones</div><h1>${title}</h1><p>${description}</p></div><div class="user-content" style="padding-top:8px">${catalogContent(kind)}</div></main>${footer()}`;}
function publicArtists(){return `${siteHeader()}<main class="container"><div class="page-hero"><span class="eyebrow">Nuestra comunidad</span><h1>Estudiantes y graduados</h1><p>Conoce a quienes dan vida a cada obra del repositorio.</p></div><div class="user-content"><div class="artist-grid">${S.artists.map(artistCard).join('')||empty('Aún no hay artistas','Los perfiles de estudiantes y graduados aparecerán aquí.')}</div></div></main>${footer()}`;}
function contactForm(){return `<form class="stack-form" data-form="contact"><div class="form-grid"><div class="field"><label for="contact-name">Nombre completo</label><input id="contact-name" class="input" name="name" minlength="2" maxlength="100" required value="${attr(S.user?.full_name||'')}"></div><div class="field"><label for="contact-email">Correo electrónico</label><input id="contact-email" type="email" class="input" name="email" maxlength="200" required value="${attr(S.user?.email||'')}"></div><div class="field field-span"><label for="contact-subject">Asunto</label><input id="contact-subject" class="input" name="subject" minlength="3" maxlength="150" required placeholder="¿En qué podemos ayudarte?"></div><div class="field field-span"><label for="contact-body">Mensaje</label><textarea id="contact-body" class="textarea" name="body" minlength="10" maxlength="4000" required placeholder="Escribe aquí tu mensaje..."></textarea></div></div><button class="btn" type="submit">Enviar mensaje ↗</button></form>`;}
function publicContact(){return `${siteHeader()}<main class="container"><div class="page-hero"><span class="eyebrow">Hablemos de arte</span><h1>Contacto</h1><p>¿Tienes preguntas sobre el archivo o deseas ponerte en contacto con la administración?</p></div><div class="contact-grid"><div class="contact-art"><span class="eyebrow">Estamos aquí</span><h2>Las buenas ideas empiezan conversando.</h2>${S.settings.contact_email?`<p style="position:relative;z-index:2">${esc(S.settings.contact_email)}</p>`:''}</div><div class="contact-form"><h2>Envíanos un mensaje</h2><p>El administrador recibirá tu consulta en su buzón. ${S.settings.contact_email?'También se notificará por correo cuando el servicio SMTP esté configurado.':''}</p>${contactForm()}</div></div></main>${footer()}`;}
function authView(){return `${siteHeader()}<main class="auth-scene"><div class="auth-left"><div><div class="eyebrow">Repositorio De Arte</div><h2>Un lugar para descubrir, conservar y compartir lo que creamos.</h2><p>Accede con tus credenciales de administrador para gestionar las obras, artistas, exposiciones y el repositorio general.</p></div><div class="small" style="position:relative;z-index:1;opacity:.75">ARTE · COMUNIDAD · PATRIMONIO</div></div><div class="auth-right"><div class="auth-card"><div class="eyebrow">Acceso administrativo</div><h1>Iniciar sesión</h1><p>Ingresa tus credenciales autorizadas para acceder al panel de administración.</p><form class="stack-form" data-form="login"><div class="field"><label for="username">Usuario o correo electrónico</label><input id="username" name="username" class="input" minlength="3" required autocomplete="username" placeholder="admin"></div><div class="field"><label for="password">Contraseña</label><input id="password" name="password" class="input" type="password" minlength="1" required autocomplete="current-password" placeholder="Tu contraseña"></div><button class="btn btn-wide" type="submit">Ingresar al panel ↗</button></form><p class="auth-note">Acceso restringido a administradores. El registro de nuevos usuarios se encuentra deshabilitado en todo el sistema.</p></div></div></main>`;}
function sidebar(){
  const items=[['overview','▦','Resumen'],['works','▤','Obras'],['categories','◇','Categorías'],['subcategories','▧','Subcategorías'],['artists','♙','Artistas'],['awards','★','Premios'],['exhibitions','▣','Exposiciones'],['messages','✉','Buzón de contacto'],['settings','⚙','Configuración']];
  return `<aside class="sidebar">${brand(true)}<div><div class="side-label">Administración</div><nav aria-label="Panel administrador">${items.map(([id,icon,title])=>`<a href="#/admin" class="side-link ${S.section===id?'active':''}" data-action="admin-section" data-section="${id}"><span class="side-icon">${icon}</span><span>${title}</span>${id==='messages'&&S.stats.messages?`<span style="margin-left:auto;background:#bb7a58;padding:3px 6px;border-radius:9px;color:white">${S.stats.messages}</span>`:''}</a>`).join('')}</nav></div><div class="side-spacer"></div><div class="side-account"><strong>${esc(S.user?.full_name)}</strong><small>Administrador</small><a href="#/inicio" class="btn btn-light btn-small btn-wide" style="margin-top:14px">Ver sitio ↗</a><button class="btn btn-sidebar-logout btn-small" data-action="logout">Cerrar sesión</button></div></aside>`;
}
const adminTitles={overview:'Panel general',works:'Gestión de obras',categories:'Categorías',subcategories:'Subcategorías',artists:'Artistas',awards:'Premios y reconocimientos',exhibitions:'Exposiciones',messages:'Buzón de contacto',settings:'Configuración'};
function dashboard(){return `<div class="dashboard">${sidebar()}<main class="dash-main"><div class="dash-top"><div><small>Repositorio De Arte / Administración</small><h1>${esc(adminTitles[S.section]||'Panel general')}</h1></div><div class="dash-top-right"><a href="#/inicio" class="btn btn-outline btn-small">↗ Ver sitio público</a><div class="profile-bubble">A</div></div></div><div class="dash-body">${adminContent()}</div></main></div>${S.modal?renderModal():''}`;}
function summaryCard(title,value,note){return `<div class="summary-card"><small>${esc(title)}</small><strong>${Number(value||0)}</strong><span class="mini-note">${esc(note)}</span></div>`;}
function adminContent(){
  if(S.section==='overview') return `<div class="welcome-strip"><div><span class="eyebrow">Panel de administración</span><h2>Bienvenido a tu archivo creativo.</h2><p>Organiza las obras, perfiles y colecciones desde un solo lugar.</p></div><button class="btn" data-action="create" data-entity="work">+ Nueva obra</button></div><div class="summary-grid">${summaryCard('Obras totales',S.stats.works,`${S.stats.published||0} publicadas`)}${summaryCard('Artistas',S.stats.artists,`${S.stats.students||0} estudiantes`)}${summaryCard('Categorías',S.stats.categories,'Clasificación artística')}${summaryCard('Mensajes sin leer',S.stats.messages,'Buzón de contacto')}${summaryCard('Premios',S.stats.awards,'Obras reconocidas')}${summaryCard('Exposiciones',S.stats.exhibitions,'Obras expuestas')}${summaryCard('Graduados',S.stats.graduates,'Perfiles actualizados')}${summaryCard('Obras vendidas',S.stats.sold,'Estado de venta')}</div><div class="dash-section"><div class="panel-heading"><div><h2>Obras recientes</h2><p>Últimos registros en el repositorio</p></div><button class="btn btn-outline btn-small" data-action="admin-section" data-section="works">Ver todas ↗</button></div>${worksTable(S.works.slice(0,5))}</div><div class="dash-section"><div class="hint-block"><strong>Primeros pasos:</strong> registra a los artistas, selecciona una categoría y subcategoría, y después publica sus obras. Los contenidos marcados como borrador no se mostrarán al público.</div></div>`;
  if(S.section==='works'||S.section==='awards'||S.section==='exhibitions') {
    const section=S.section;const list=section==='awards'?S.works.filter(w=>w.has_award):section==='exhibitions'?S.works.filter(w=>w.is_exhibited):S.works;
    const msg=section==='works'?'Administra información, imágenes, publicación y estado de venta.':section==='awards'?'Obras marcadas con premios y reconocimientos.':'Obras marcadas como expuestas; registra también si están vendidas.';
    return `<div class="panel-heading"><div><h2>${esc(adminTitles[section])}</h2><p>${esc(msg)}</p></div><button class="btn" data-action="create" data-entity="work" data-default="${section}">+ Añadir obra</button></div>${S.artists.length===0?`<div class="hint-block">Para registrar una obra, primero crea un perfil de artista en <strong>Artistas</strong>.</div>`:''}${worksTable(list)}`;
  }
  if(S.section==='categories')return `<div class="panel-heading"><div><h2>Categorías</h2><p>Agrega disciplinas y activa o desactiva su visibilidad.</p></div><button class="btn" data-action="create" data-entity="category">+ Nueva categoría</button></div>${entityTable('category')}`;
  if(S.section==='subcategories')return `<div class="panel-heading"><div><h2>Subcategorías</h2><p>Clasifica cada disciplina en estilos y técnicas.</p></div><button class="btn" data-action="create" data-entity="subcategory">+ Nueva subcategoría</button></div>${entityTable('subcategory')}`;
  if(S.section==='artists')return `<div class="panel-heading"><div><h2>Estudiantes y graduados</h2><p>Gestiona perfiles y cambia su estado académico sin perder sus obras.</p></div><button class="btn" data-action="create" data-entity="artist">+ Añadir artista</button></div>${entityTable('artist')}`;
  if(S.section==='messages')return `<div class="panel-heading"><div><h2>Mensajes recibidos</h2><p>Consultas enviadas desde el formulario de contacto.</p></div>${pill(`${S.stats.messages||0} sin leer`)}</div>${S.messages.map(messageCard).join('')||empty('El buzón está vacío','Los mensajes de contacto aparecerán en esta sección.')}`;
  if(S.section==='settings')return settingsPanel();
  return '';
}
function worksTable(items){return items.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Obra</th><th>Categoría</th><th>Artista</th><th>Publicación</th><th>Venta</th><th style="text-align:right">Acciones</th></tr></thead><tbody>${items.map(w=>`<tr><td><div class="inline-name">${w.image_url?`<img class="tiny-thumb" src="${attr(w.image_url)}" alt="">`:`<div class="tiny-thumb">A</div>`}<div><strong>${esc(w.title)}</strong><div class="muted small">${esc(w.subcategory_name)}</div></div></div></td><td>${esc(w.category_name)}</td><td>${esc(w.artist_name)}</td><td>${pill(label(w.status,statuses),w.status==='draft'?'status-off':'')}</td><td>${pill(label(w.sale_status,statuses),w.sale_status==='sold'?'status-sold':'')}</td><td><div class="td-actions"><button class="btn btn-ghost btn-small" data-action="edit" data-entity="work" data-id="${attr(w.id)}">Editar</button><button class="btn btn-ghost btn-small" title="Cambiar publicación" data-action="toggle-status" data-id="${attr(w.id)}">${w.status==='published'?'Ocultar':'Publicar'}</button><button class="btn btn-danger btn-small" data-action="delete" data-entity="work" data-id="${attr(w.id)}">Eliminar</button></div></td></tr>`).join('')}</tbody></table></div>`:empty('No hay obras registradas','Puedes empezar creando una obra desde el botón superior.');}
function entityTable(type){
  const collection={category:S.categories,subcategory:S.subcategories,artist:S.artists}[type];
  if(!collection.length)return empty('Sin registros todavía','Utiliza el botón superior para registrar el primero.');
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>${type==='artist'?'Programa':'Descripción / categoría'}</th><th>Estado</th><th style="text-align:right">Acciones</th></tr></thead><tbody>${collection.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(type==='category'?shorten(x.description,70):type==='subcategory'?(S.categories.find(c=>c.id===x.category_id)?.name||'—'):(x.program||'—'))}</td><td>${type==='artist'?pill(label(x.academic_status,statuses)):pill(x.is_active?'Activa':'Inactiva',x.is_active?'':'status-off')}</td><td><div class="td-actions"><button class="btn btn-ghost btn-small" data-action="edit" data-entity="${type}" data-id="${attr(x.id)}">Editar</button>${type==='artist'?`<button class="btn btn-outline btn-small" data-action="graduate" data-id="${attr(x.id)}">${x.academic_status==='graduate'?'A estudiante':'Graduar'}</button>`:`<button class="btn btn-outline btn-small" data-action="toggle-entity" data-entity="${type}" data-id="${attr(x.id)}">${x.is_active?'Desactivar':'Activar'}</button>`}<button class="btn btn-danger btn-small" data-action="delete" data-entity="${type}" data-id="${attr(x.id)}">Eliminar</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
function messageCard(m){return `<article class="message ${m.is_read?'':'unread'}"><div class="message-title"><h3>${esc(m.subject)} ${m.is_read?'':tag('Nuevo','tag-accent')}</h3><span class="message-meta">${date(m.created_at)}</span></div><div class="message-meta">De ${esc(m.name)} · ${esc(m.email)}</div><p>${esc(m.body)}</p><div class="message-actions"><a class="btn btn-outline btn-small" href="mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent('Re: '+m.subject)}">Responder por correo</a><button class="btn btn-outline btn-small" data-action="message-read" data-id="${attr(m.id)}">${m.is_read?'Marcar sin leer':'Marcar leído'}</button><button class="btn btn-danger btn-small" data-action="delete" data-entity="message" data-id="${attr(m.id)}">Eliminar</button></div></article>`;}
function settingsPanel(){return `<div class="panel" style="max-width:680px"><h2>Contacto institucional</h2><p class="muted small">Define la dirección de correo que recibirá las notificaciones del buzón.</p><form class="stack-form" data-form="settings"><div class="field"><label for="institution">Nombre de la institución</label><input id="institution" class="input" name="institution" required minlength="2" maxlength="120" value="${attr(S.settings.institution)}"></div><div class="field"><label for="contact_email">Correo del administrador</label><input id="contact_email" class="input" type="email" name="contact_email" value="${attr(S.settings.contact_email)}" placeholder="arte@universidad.edu.ec"><span class="field-help">Los mensajes se guardan siempre en el buzón. Para enviar notificaciones por correo configura SMTP en backend/.env.</span></div><button class="btn" type="submit">Guardar configuración</button></form><p class="small" style="margin:18px 0 0;color:var(--muted)">Servidor SMTP: ${S.settings.smtp_configured?pill('Configurado'):pill('Pendiente','status-off')}</p></div><div class="panel" style="max-width:680px;margin-top:20px"><h2>Seguridad de cuenta</h2><p class="muted small">Cambia la contraseña del administrador antes de compartir esta aplicación.</p><form class="stack-form" data-form="password"><div class="field"><label>Contraseña actual</label><input type="password" class="input" name="current_password" required></div><div class="field"><label>Contraseña nueva (mínimo 8 caracteres)</label><input type="password" minlength="8" class="input" name="new_password" required></div><button class="btn" type="submit">Cambiar contraseña</button></form></div>`;}
function userPanel(){const tabs=[['explore','Explorar obras'],['awards','Premios'],['exhibitions','Exposiciones'],['exhibited','Obras expuestas'],['artists','Estudiantes y graduados'],['contact','Contacto']];
  const title=S.user?.full_name?.split(' ')[0]||'Artista';
  let content;
  if(S.userSection==='myworks'){
    content=`<div class="section-header"><div><span class="eyebrow">Tu producción</span><h2>Mis obras</h2></div><button class="btn" data-action="create" data-entity="work">+ Subir obra</button></div>${S.myWorks.length?`<div class="works-grid">${S.myWorks.map(w=>`<article class="work-card"><div class="work-thumb">${media(w)}<span class="work-label">${w.status==='published'?'Publicada':'Borrador'}</span></div><div class="work-info"><h3>${esc(w.title)}</h3><p>${esc(w.category_name)} · ${esc(w.subcategory_name)}</p>${w.model_url?`<a class="text-link" href="${attr(w.model_url)}" target="_blank">Ver modelo ${esc(w.model_format?.toUpperCase())} ↗</a>`:''}<div class="td-actions" style="justify-content:flex-start;margin-top:12px"><button class="btn btn-outline btn-small" data-action="edit" data-entity="work" data-id="${attr(w.id)}">Editar</button>${w.status==='draft'?`<button class="btn btn-danger btn-small" data-action="delete" data-entity="work" data-id="${attr(w.id)}">Eliminar</button>`:''}</div></div></article>`).join('')}</div>`:empty('Aún no tienes obras','Sube tu primera imagen o obra 3D desde el botón superior.')}`;
  } else {
    content=S.userSection==='artists'?`<div class="artist-grid">${S.artists.map(artistCard).join('')||empty('Sin artistas registrados','Pronto podrás descubrir a todos los artistas.')}</div>`:S.userSection==='contact'?`<div class="contact-grid" style="padding-top:0"><div class="contact-art"><span class="eyebrow">Contacto</span><h2>Tu voz también es parte del archivo.</h2></div><div class="contact-form"><h2>Escríbenos</h2>${contactForm()}</div></div>`:`<div class="section-header"><div><span class="eyebrow">Tu espacio / Colecciones</span><h2>${esc(descriptions[S.userSection]?.[0]||'Explorar obras')}</h2></div><p class="section-intro">${esc(descriptions[S.userSection]?.[1]||'')}</p></div>${catalogContent(S.userSection)}`;
  }
  return `<div class="user-shell">${siteHeader()}<section class="user-banner"><div class="container"><div class="eyebrow">Panel de usuario</div><h1>Hola, ${esc(title)} <span class="serif">bienvenido al arte.</span></h1><p>Explora colecciones, descubre artistas y conoce las obras del repositorio.</p><nav class="user-tabs" aria-label="Secciones de usuario">${tabs.map(([id,name])=>`<a href="#/usuario" data-action="user-section" data-section="${id}" class="${S.userSection===id?'active':''}">${name}</a>`).join('')}</nav></div></section><main class="container user-content">${content}</main>${footer()}${S.modal?renderModal():''}</div>`;
}
function field(labelText,name,value='',opts={}){const id=`field-${name}`;return `<div class="field ${opts.span?'field-span':''}"><label for="${id}">${esc(labelText)}</label>${opts.textarea?`<textarea id="${id}" name="${name}" class="textarea" ${opts.required?'required':''} maxlength="${opts.max||4000}">${esc(value)}</textarea>`:`<input id="${id}" class="input" name="${name}" type="${opts.type||'text'}" value="${attr(value)}" ${opts.required?'required':''} ${opts.max?`maxlength="${opts.max}"`:''}>`}</div>`;}
function selectField(labelText,name,items,value,placeholder='Seleccionar...',opts={}) {return `<div class="field"><label for="field-${name}">${esc(labelText)}</label><select class="select" id="field-${name}" name="${name}" ${opts.required?'required':''}>${selectOptions(items,value,placeholder,opts.fields||['id','name'])}</select></div>`;}
function choiceField(labelText,name,options,value){return `<div class="field"><label for="field-${name}">${esc(labelText)}</label><select class="select" name="${name}" id="field-${name}">${options.map(([v,l])=>`<option value="${attr(v)}" ${v===value?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`;}
function checkField(name,text,checked=false){return `<label class="checkbox-field"><input type="checkbox" name="${name}" ${checked?'checked':''}><span>${esc(text)}</span></label>`;}
function entityModal(){
  const {type,item,defaults={}}=S.modal, editing=!!item;
  let content='', title='';
  if(type==='category') {title=editing?'Editar categoría':'Nueva categoría';content=`${field('Nombre','name',item?.name||'',{required:true,max:80})}${field('Descripción','description',item?.description||'',{textarea:true,span:true,max:400})}${checkField('is_active','Categoría activa',item?item.is_active:true)}`;}
  if(type==='subcategory'){title=editing?'Editar subcategoría':'Nueva subcategoría';content=`${field('Nombre','name',item?.name||'',{required:true,max:80})}${selectField('Categoría','category_id',S.categories,item?.category_id,'Selecciona una categoría',{required:true})}${checkField('is_active','Subcategoría activa',item?item.is_active:true)}`;}
  if(type==='artist'){title=editing?'Editar artista':'Añadir estudiante o graduado';content=`${field('Nombre completo','name',item?.name||'',{required:true,max:120})}${choiceField('Situación académica','academic_status',[['student','Estudiante'],['graduate','Graduado']],item?.academic_status||'student')}${field('Carrera o programa','program',item?.program||'',{max:140})}${field('Biografía','biography',item?.biography||'',{textarea:true,span:true,max:2000})}`;}
  if(type==='work'){
    title=editing?'Editar obra':'Nueva obra';
    const categoryId=item?.category_id||S.categories[0]?.id||'';
    const sub=S.subcategories.filter(x=>x.category_id===categoryId);
    const isUser=S.user?.role==='user';
    content=`${field('Título de la obra','title',item?.title||'',{required:true,max:180})}${field('Año de creación','year',item?.year||'',{max:4})}${isUser?'':selectField('Artista','artist_id',S.artists,item?.artist_id,'Selecciona un artista',{required:true})}${selectField('Categoría','category_id',S.categories,categoryId,'Selecciona una categoría',{required:true})}${selectField('Subcategoría','subcategory_id',sub,item?.subcategory_id||sub[0]?.id,'Selecciona una subcategoría',{required:true})}${isUser?'':choiceField('Estado de publicación','status',[['published','Publicada'],['draft','Borrador']],item?.status||'published')}${isUser?'':choiceField('Estado de venta','sale_status',[['available','No vendida'],['sold','Vendida']],item?.sale_status||'available')}${field('Descripción de la obra','description',item?.description||'',{textarea:true,span:true,max:4000})}<div class="field field-span"><label>Imagen de la obra (Solo formatos PNG o JPG/JPN; máximo 5 MB)</label><input class="input" type="file" name="image_file" accept=".png,.jpg,.jpeg,.jpn,image/png,image/jpeg" style="padding:9px">${item?.image_url?`<span class="field-help">Ya hay una imagen subida; selecciona otra para reemplazarla.</span>${checkField('remove_image','Eliminar imagen actual',false)}`:''}</div><div class="field field-span"><label>Obra 3D (GLB o glTF; máximo 30 MB)</label><input class="input" type="file" name="model_file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" style="padding:9px">${item?.model_url?`<span class="field-help">Modelo actual: ${esc(item.model_format?.toUpperCase())}</span>${checkField('remove_model','Eliminar modelo 3D actual',false)}`:''}</div>${isUser?'':`<div class="field field-span">${checkField('has_award','Esta obra recibió un premio',item?.has_award||defaults.has_award||false)}</div>${field('Nombre del premio (opcional)','award_name',item?.award_name||'',{max:180})}<div class="field field-span">${checkField('is_exhibited','Esta obra fue expuesta',item?.is_exhibited||defaults.is_exhibited||false)}</div>${field('Nombre de la exposición (opcional)','exhibition_name',item?.exhibition_name||'',{max:180})}`}`;
  }
  return `<div class="modal-backdrop" id="modal-backdrop" role="presentation"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><span class="eyebrow">Gestión de contenido</span><h2 id="modal-title">${title}</h2></div><button class="close-btn" data-action="close-modal" aria-label="Cerrar">×</button></div><div class="modal-body">${type==='work'&&!S.artists.length?`<div class="hint-block">Primero debes crear al menos un artista desde la sección Artistas.</div>`:''}<form data-form="entity" data-entity="${type}" data-id="${attr(item?.id||'')}"><div class="form-grid">${content}</div><div class="form-actions"><button class="btn btn-outline" type="button" data-action="close-modal">Cancelar</button><button class="btn" type="submit">${editing?'Guardar cambios':'Crear registro'}</button></div></form></div></div></div>`;
}
function detailModal(){const w=S.modal.work;return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal work-modal" role="dialog" aria-modal="true" aria-label="Detalle de obra"><div class="work-modal-media">${media(w)}${w.model_url?`<a class="model-download" href="${attr(w.model_url)}" target="_blank" rel="noopener">Abrir modelo ${esc(w.model_format?.toUpperCase())} ↗</a>`:''}</div><div class="work-modal-info"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span class="eyebrow">${esc(w.category_name)} / ${esc(w.subcategory_name)}</span><button class="close-btn" data-action="close-modal" aria-label="Cerrar">×</button></div><h2>${esc(w.title)}</h2><p>${esc(w.description||'Obra del repositorio de arte.')}</p><div class="tags">${w.has_award?tag('Premiada','tag-accent'):''}${w.is_exhibited?tag('Expuesta'):''}${w.is_exhibited?tag(label(w.sale_status,statuses),w.sale_status==='sold'?'tag-accent':'tag-success'):''}</div><div class="detail-line"><span>Artista</span><b>${esc(w.artist_name)}</b></div><div class="detail-line"><span>Situación académica</span><b>${esc(label(w.academic_status,statuses))}</b></div><div class="detail-line"><span>Año</span><b>${esc(w.year||'Sin especificar')}</b></div>${w.has_award&&w.award_name?`<div class="detail-line"><span>Premio</span><b>${esc(w.award_name)}</b></div>`:''}${w.is_exhibited&&w.exhibition_name?`<div class="detail-line"><span>Exposición</span><b>${esc(w.exhibition_name)}</b></div>`:''}</div></div></div>`;}
function renderModal(){if(!S.modal)return '';return S.modal.type==='detail'?detailModal():entityModal();}
function render(){
  const r=route();
  if(r==='admin'){ if(!S.user){go('login');return;} if(S.user.role!=='admin'){go('usuario');return;} history.replaceState(null,'','/admin'); root.innerHTML=dashboard();return; }
  if(r==='usuario'){if(!S.user){go('login');return;} if(S.user.role==='admin'){go('admin');return;} history.replaceState(null,'','/usuario'); root.innerHTML=userPanel(); if(S.modal)root.insertAdjacentHTML('beforeend',renderModal()); return;}
  if(r==='login' || r==='registro'){ if(S.user){go(S.user.role==='admin'?'admin':'usuario');return;} history.replaceState(null,'','/login'); root.innerHTML=authView();return; }
  if(r==='explorar'||r==='premios'||r==='exposiciones'||r==='expuestas')root.innerHTML=publicCatalog({explorar:'explore',premios:'awards',exposiciones:'exhibitions',expuestas:'exhibited'}[r]);
  else if(r==='artistas')root.innerHTML=publicArtists();
  else if(r==='contacto')root.innerHTML=publicContact();
  else root.innerHTML=home();
  if(S.modal)root.insertAdjacentHTML('beforeend',renderModal());
}
async function refresh(){await loadData();render();}
async function fileData(file){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=()=>reject(Error('No se pudo leer la imagen.'));fr.readAsDataURL(file);});}
const collections={category:'categories',subcategory:'subcategories',artist:'artists',work:'works'};
async function handleSubmit(form){
  const kind=form.dataset.form,b=new FormData(form),obj=Object.fromEntries(b.entries());
  const submit=form.querySelector('[type="submit"]');
  if(submit)submit.disabled=true;
  try{
    if(kind==='login'||kind==='register'){
      if(kind==='register')throw Error('El registro de usuarios está deshabilitado. Solo el administrador puede ingresar.');
      const result=await request('POST','/api/auth/login',{username:obj.username,password:obj.password});
      if(result.user?.role !== 'admin'){
        throw Error('Acceso no autorizado. Solo el administrador puede ingresar al sistema.');
      }
      S.token=result.token;localStorage.setItem('ra_token',result.token);S.user=result.user;S.modal=null;S.section='overview';S.userSection='explore';await loadData();toast(`Bienvenido, ${S.user.full_name}.`);go('admin');return;
    }
    if(kind==='contact'){await request('POST','/api/messages',obj);form.reset();toast('Tu mensaje fue enviado al buzón del administrador.');return;}
    if(kind==='settings'){await request('PUT','/api/settings',obj);toast('Configuración guardada.');await refresh();return;}
    if(kind==='password'){await request('POST','/api/auth/change-password',obj);S.user=null;S.token='';localStorage.removeItem('ra_token');toast('Contraseña actualizada. Inicia sesión de nuevo.');go('login');return;}
    if(kind==='entity'){
      const entity=form.dataset.entity,id=form.dataset.id;
      if(entity==='work'){
        if(S.user?.role !== 'admin') throw Error('Solo los administradores pueden subir o editar obras.');
        obj.is_exhibited=!!form.elements.namedItem('is_exhibited')?.checked;
        obj.has_award=!!form.elements.namedItem('has_award')?.checked;
        obj.remove_image=!!form.elements.namedItem('remove_image')?.checked;
        const file=form.elements.namedItem('image_file')?.files[0];
        if(file){
          if(file.size>5*1024*1024)throw Error('La imagen supera 5 MB.');
          const ext=file.name.toLowerCase().split('.').pop();
          if(!['png','jpg','jpeg','jpn'].includes(ext))throw Error('Formato no permitido. Solo se aceptan imágenes en formato PNG o JPG/JPN.');
          obj.image_data=await fileData(file);
        }
        delete obj.image_file;
        obj.remove_model=!!form.elements.namedItem('remove_model')?.checked;
        const model=form.elements.namedItem('model_file')?.files[0];
        if(model){
          if(model.size>30*1024*1024)throw Error('El modelo 3D supera 30 MB.');
          const extension=model.name.toLowerCase().split('.').pop();
          if(!['glb','gltf'].includes(extension))throw Error('Selecciona un archivo GLB o glTF.');
          obj.model_format=extension;
          obj.model_data=await fileData(model);
        }
        delete obj.model_file;
      }
      if(entity==='category'||entity==='subcategory')obj.is_active=!!form.elements.namedItem('is_active').checked;
      const resource=collections[entity];await request(id?'PUT':'POST',`/api/${resource}${id?'/'+id:''}`,obj);
      S.modal=null;await refresh();toast(id?'Cambios guardados correctamente.':'Registro creado correctamente.');return;
    }
  }catch(e){toast(e.message,true);}
  finally{if(submit)submit.disabled=false;}
}
async function handleClick(el,event){
  const action=el.dataset.action,id=el.dataset.id,entity=el.dataset.entity;
  if(action==='close-modal'){S.modal=null;render();return;}
  if(action==='category'){event.preventDefault();S.filters={search:'',category_id:id,subcategory_id:'',academic_status:'',sale_status:''};go('explorar');return;}
  if(action==='admin-section'){event.preventDefault();S.section=el.dataset.section;S.modal=null;go('admin');return;}
  if(action==='user-section'){event.preventDefault();S.userSection=el.dataset.section;S.filters={search:'',category_id:'',subcategory_id:'',academic_status:'',sale_status:''};S.modal=null;go('usuario');return;}
  if(action==='clear-filters'){S.filters={search:'',category_id:'',subcategory_id:'',academic_status:'',sale_status:''};render();return;}
  if(action==='open-work'){const w=S.works.find(w=>w.id===id);if(w){S.modal={type:'detail',work:w};render();}return;}
  if(action==='create'){
    if(entity==='work' && S.user?.role !== 'admin'){
      toast('Solo los administradores pueden subir obras.', true);
      return;
    }
    const defaults=el.dataset.default==='awards'?{has_award:true}:el.dataset.default==='exhibitions'?{is_exhibited:true}:{};
    S.modal={type:entity,defaults};render();return;
  }
  if(action==='edit'){const item=S[collections[entity]]?.find(x=>x.id===id);if(item){S.modal={type:entity,item};render();}return;}
  try {
    if(action==='logout'){
      const token=S.token;
      S.token='';
      S.user=null;
      S.modal=null;
      localStorage.removeItem('ra_token');
      if(token) fetch('/api/auth/logout',{method:'POST',headers:{Authorization:`Bearer ${token}`}}).catch(()=>{});
      history.replaceState(null,'','/');
      location.replace('/');
      return;
    }
    if(action==='delete'){
      if(!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.'))return;
      await request('DELETE',entity==='message'?`/api/messages/${id}`:`/api/${collections[entity]}/${id}`);await refresh();toast('Registro eliminado.');return;
    }
    if(action==='toggle-entity'){const item=S[collections[entity]].find(x=>x.id===id);await request('PATCH',`/api/${collections[entity]}/${id}`,{is_active:!item.is_active});await refresh();toast('Estado actualizado.');return;}
    if(action==='toggle-status'){const w=S.works.find(x=>x.id===id);await request('PATCH',`/api/works/${id}`,{status:w.status==='published'?'draft':'published'});await refresh();toast('Publicación actualizada.');return;}
    if(action==='graduate'){const a=S.artists.find(x=>x.id===id);await request('PATCH',`/api/artists/${id}`,{academic_status:a.academic_status==='graduate'?'student':'graduate'});await refresh();toast('Situación académica actualizada.');return;}
    if(action==='message-read'){const m=S.messages.find(x=>x.id===id);await request('PATCH',`/api/messages/${id}`,{is_read:!m.is_read});await refresh();return;}
  } catch(e){toast(e.message,true);}
}
function updateCatalogList(){
  const list=document.querySelector('#catalog-list'), counter=document.querySelector('#results-count');
  if(!list)return;
  const kind=route()==='premios'?'awards':route()==='exposiciones'?'exhibitions':route()==='expuestas'?'exhibited':route()==='usuario'?S.userSection:'explore';
  const w=filteredWorks(kind);list.innerHTML=w.map(workCard).join('')||empty('No se encontraron obras','Prueba con otra búsqueda o categoría.');
  if(counter)counter.textContent=`${w.length} resultado(s)`;
}
root.addEventListener('submit',e=>{const form=e.target.closest('form[data-form]');if(form){e.preventDefault();handleSubmit(form);}});
root.addEventListener('click',e=>{if(e.target.id==='modal-backdrop'){S.modal=null;render();return;}const el=e.target.closest('[data-action]');if(el){if(el.tagName==='BUTTON'&&el.type==='submit'&&el.closest('form'))return;handleClick(el,e);}});
root.addEventListener('click',e=>{
  const logoutButton=e.target.closest('[data-action="logout"]');
  if(!logoutButton)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const token=S.token;
  S.token='';
  S.user=null;
  localStorage.removeItem('ra_token');
  if(token) fetch('/api/auth/logout',{method:'POST',headers:{Authorization:`Bearer ${token}`}}).catch(()=>{});
  history.replaceState(null,'','/');
  location.replace('/');
});
root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ') && e.target.matches('[data-action="open-work"]')){e.preventDefault();handleClick(e.target,e);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&S.modal){S.modal=null;render();}});
root.addEventListener('input',e=>{if(e.target.id==='catalog-search'){S.filters.search=e.target.value;updateCatalogList();}});
root.addEventListener('change',e=>{
  if(e.target.dataset.filter){S.filters[e.target.dataset.filter]=e.target.value;if(e.target.dataset.filter==='category_id')S.filters.subcategory_id='';render();return;}
  if(e.target.name==='category_id'&&e.target.closest('form[data-entity="work"]')){
    const select=e.target.closest('form').querySelector('select[name="subcategory_id"]');
    const sub=S.subcategories.filter(x=>x.category_id===e.target.value);
    select.innerHTML=selectOptions(sub,sub[0]?.id,'Selecciona una subcategoría');
  }
});
window.addEventListener('hashchange',()=>{S.modal=null;render();window.scrollTo(0,0);});
init();
