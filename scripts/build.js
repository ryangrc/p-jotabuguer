const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..'), out=path.join(root,'public');
fs.mkdirSync(out,{recursive:true});
// Explicit browser assets only; server code, backups and secrets never enter public/.
for(const name of ['index.html','app.js','styles.css','config','repositories','models','services']) {
  fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true,filter:src=>!src.endsWith('.md')});
}
console.log('Assets públicos preparados.');
