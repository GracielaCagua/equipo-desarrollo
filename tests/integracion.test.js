import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function startServer(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'repoarte-test-'));
  fs.mkdirSync(path.join(dir,'backend','src'),{recursive:true});
  fs.mkdirSync(path.join(dir,'frontend'),{recursive:true});
  fs.copyFileSync(path.join(root,'backend','src','server.js'),path.join(dir,'backend','src','server.js'));
  fs.copyFileSync(path.join(root,'package.json'),path.join(dir,'package.json'));
  for(const name of ['index.html','styles.css','app.js','favicon.svg'])fs.copyFileSync(path.join(root,'frontend',name),path.join(dir,'frontend',name));
  const port=38000+Math.floor(Math.random()*2000);
  const child=spawn(process.execPath,[path.join(dir,'backend','src','server.js')],{env:{...process.env,PORT:String(port)},stdio:'pipe'});
  let started=false;
  for(let i=0;i<80;i++){
    if(child.exitCode!==null)break;
    try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.ok){started=true;break;}}catch{}
    await wait(50);
  }
  if(!started){child.kill();throw Error('No se pudo iniciar el servidor de pruebas.');}
  return {dir,child,base:`http://127.0.0.1:${port}`};
}
async function req(base,method,url,body,token){
  const r=await fetch(`${base}${url}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
  return {status:r.status,data:await r.json()};
}
test('Flujo completo: cuentas, permisos, catálogo, venta, exposición y buzón',async()=>{
  const {dir,child,base}=await startServer();
  try{
    const home=await fetch(base+'/');assert.equal(home.status,200);assert.match(await home.text(),/Repositorio De Arte/);
    const admin=await req(base,'POST','/api/auth/login',{username:'admin',password:'admin123'});assert.equal(admin.status,200);assert.equal(admin.data.user.role,'admin');
    const at=admin.data.token;

    // 1. Registro de usuario deshabilitado en todo el sistema
    const register=await req(base,'POST','/api/auth/register',{username:'estudiante01',full_name:'Usuario Prueba',email:'test@ejemplo.com',password:'claveSegura123'});
    assert.equal(register.status,403);

    // 2. Solo el administrador puede ingresar
    const nonAdmin=await req(base,'POST','/api/auth/login',{username:'estudiante01',password:'claveSegura123'});
    assert.equal(nonAdmin.status,401);

    // 3. Crear categorías, subcategorías y artistas como admin
    const c=await req(base,'POST','/api/categories',{name:'Arte textil',description:'Tejidos',is_active:true},at);assert.equal(c.status,201);
    const s=await req(base,'POST','/api/subcategories',{name:'Bordado',category_id:c.data.id,is_active:true},at);assert.equal(s.status,201);
    const a=await req(base,'POST','/api/artists',{name:'Artista Uno',academic_status:'student',program:'Artes visuales'},at);assert.equal(a.status,201);

    // 4. Solo administradores pueden subir obras (rechazar no autenticado)
    const deniedWork=await req(base,'POST','/api/works',{title:'Sin auth',description:'Prueba'});assert.equal(deniedWork.status,403);

    // 5. Validar que formatos no permitidos (webp, gif) se rechazan para imágenes
    const webpData='data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/2QAA';
    const badImageWork=await req(base,'POST','/api/works',{title:'WebP no permitido',description:'Intento webp',artist_id:a.data.id,category_id:c.data.id,subcategory_id:s.data.id,image_data:webpData},at);
    assert.equal(badImageWork.status,400);

    // 6. Subir obra como administrador con descripción y formatos válidos (PNG y JPN), manteniendo esculturas 3D (GLB)
    const png=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0,73,69,78,68,174,66,96,130]).toString('base64');
    const glb=Buffer.alloc(20);glb.write('glTF',0,'ascii');glb.writeUInt32LE(2,4);
    const w=await req(base,'POST','/api/works',{
      title:'Memoria de hilo',
      description:'Una composición textil con técnica mixta.',
      artist_id:a.data.id,
      category_id:c.data.id,
      subcategory_id:s.data.id,
      status:'published',
      sale_status:'available',
      has_award:true,
      award_name:'Premio académico',
      is_exhibited:true,
      exhibition_name:'Muestra universitaria',
      year:'2026',
      image_data:`data:image/png;base64,${png}`,
      model_format:'glb',
      model_data:`data:model/gltf-binary;base64,${glb.toString('base64')}`
    },at);
    assert.equal(w.status,201);
    assert.equal(w.data.description,'Una composición textil con técnica mixta.');
    assert.ok(w.data.image_url.endsWith('.png'));
    assert.equal(w.data.model_format,'glb');

    // 7. Subir obra con formato JPN
    const jpnHeader=Buffer.from([0xff,0xd8,0xff,0xe0,0,0x10,0x4a,0x46,0x49,0x46,0,1,1,0,0,1,0,1,0,0]).toString('base64');
    const jpnWork=await req(base,'POST','/api/works',{
      title:'Pintura al temple',
      description:'Pintura en formato JPN aceptado.',
      artist_id:a.data.id,
      category_id:c.data.id,
      subcategory_id:s.data.id,
      status:'published',
      sale_status:'available',
      image_data:`data:image/jpn;base64,${jpnHeader}`
    },at);
    assert.equal(jpnWork.status,201);
    assert.ok(jpnWork.data.image_url.endsWith('.jpn'));

    // 8. Catálogo público con filtros
    const catalog=await req(base,'GET','/api/works?award=1&exhibited=1');assert.equal(catalog.status,200);assert.equal(catalog.data.length,1);
    const graduate=await req(base,'PATCH',`/api/artists/${a.data.id}`,{academic_status:'graduate'},at);assert.equal(graduate.data.academic_status,'graduate');
    const sold=await req(base,'PATCH',`/api/works/${w.data.id}`,{sale_status:'sold'},at);assert.equal(sold.data.sale_status,'sold');

    // 9. Contacto y buzón
    const contact=await req(base,'POST','/api/messages',{name:'Visitante',email:'visita@ejemplo.com',subject:'Consulta de arte',body:'Me interesa conocer las obras.'});assert.equal(contact.status,201);
    const inbox=await req(base,'GET','/api/messages',undefined,at);assert.equal(inbox.data.length,1);
    const inboxDenied=await req(base,'GET','/api/messages');assert.equal(inboxDenied.status,403);

    // 10. Estados borrador y publicación
    const draft=await req(base,'PATCH',`/api/works/${w.data.id}`,{status:'draft'},at);assert.equal(draft.data.status,'draft');
    const publicAfter=await req(base,'GET','/api/works');assert.equal(publicAfter.data.length,1);
    const privateAfter=await req(base,'GET','/api/works?all=1',undefined,at);assert.equal(privateAfter.data.length,2);

    const data=JSON.parse(fs.readFileSync(path.join(dir,'backend','data','repositorio.json'),'utf8'));
    assert.equal(data.users[0].password_hash.includes('admin123'),false);
  } finally {child.kill('SIGTERM');await wait(100);fs.rmSync(dir,{recursive:true,force:true});}
});
