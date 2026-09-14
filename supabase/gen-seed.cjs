const fs=require('fs');
const path='C:/Users/Mariano/Desktop/Dev WEB/proyecto para editar/src/data/products.ts';
let txt=fs.readFileSync(path,'utf8');
let m=txt.match(/export const PRODUCTS[^=]*=\s*(\[[\s\S]*?\]);\s*export const TESTIMONIALS/);
if(!m){ console.log('no match'); process.exit(1)}
let arrStr=m[1];
let PRODUCTS=Function('return '+arrStr)();
console.log('count',PRODUCTS.length);
let sql='-- Seed productos La Joaquina - pegar en Supabase SQL Editor > New query > Run\n';
sql+='-- Si te da error de clave, ejecuta supabase/schema.sql primero\n';
sql+='INSERT INTO products (id, data) VALUES\n';
let vals=PRODUCTS.map(p=>{
  let j=JSON.stringify(p).replace(/'/g,"''");
  return "('" + p.id.replace(/'/g,"''") + "', '" + j + "'::jsonb)"
}).join(',\n');
sql+=vals+'\nON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data, updated_at=now();\n';
fs.writeFileSync('C:/Users/Mariano/Desktop/Dev WEB/proyecto para editar/supabase/seed-products.sql', sql, 'utf8');
console.log('sql length',sql.length);
console.log('done');
