import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'android/app/src/main/assets/www');
const env={...process.env,VITE_ANDROID_APP:'true',VITE_BASE_PATH:'./'};
for(const args of [['node_modules/typescript/bin/tsc','--noEmit'],['node_modules/vite/bin/vite.js','build','--outDir',output,'--emptyOutDir']]){
  const r=spawnSync(process.execPath,args,{cwd:root,env,stdio:'inherit'});
  if(r.status!==0)process.exit(r.status??1);
}
if(existsSync(path.join(output,'sw.js'))||existsSync(path.join(output,'manifest.webmanifest')))throw new Error('Android bundle must not depend on a service worker or PWA manifest.');
if(!readFileSync(path.join(output,'index.html'),'utf8').includes('./assets/'))throw new Error('Native assets need relative paths.');
mkdirSync(path.join(output,'licenses'),{recursive:true});
cpSync(path.join(root,'LICENSES'),path.join(output,'licenses'),{recursive:true});
console.log('Android assets ready. No hosting or runtime network access required.');
