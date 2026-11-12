import {readFile,readdir,mkdir,writeFile,rm,cp} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=p=>readFile(resolve(root,p),'utf8');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const assets={};
for(const file of await readdir(resolve(root,'public'))){const ext=file.slice(file.lastIndexOf('.'));if(mime[ext]&&!file.endsWith('.test.mjs'))assets['/'+file]={type:mime[ext],body:await read('public/'+file)};}
if(!assets['/index.html'])throw new Error('Missing public/index.html');
const crypto=(await read('worker/crypto.mjs')).replaceAll('export ','');
const engine=(await read('server/engine.mjs')).replace(/^import .*from 'node:crypto';\n/,'').replaceAll('export ','');
if(engine.includes('node:'))throw new Error('Unsupported Node import in portable engine');
const handler=(await read('worker/handler.mjs')).replaceAll('export ','');
const bundle=`${crypto}\n${engine}\n${handler}\nexport default {fetch:createHandler(createEngine,${JSON.stringify(assets)})};\n`;
await mkdir(resolve(root,'dist/server'),{recursive:true});await mkdir(resolve(root,'dist/.openai'),{recursive:true});
await writeFile(resolve(root,'dist/server/index.js'),bundle);
await cp(resolve(root,'.openai/hosting.json'),resolve(root,'dist/.openai/hosting.json'));
await cp(resolve(root,'db/migrations'),resolve(root,'dist/drizzle'),{recursive:true});
console.log(`Built portable Worker: ${Object.keys(assets).length} assets; ${Buffer.byteLength(bundle)} bytes`);
