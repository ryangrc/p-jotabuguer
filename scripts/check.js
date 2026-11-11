const fs=require('node:fs'), path=require('node:path'), {execFileSync}=require('node:child_process');
for(const dir of ['cloud','api','scripts','services']) for(const file of fs.readdirSync(dir)) if(file.endsWith('.js')) execFileSync(process.execPath,['--check',path.join(dir,file)],{stdio:'inherit'});
execFileSync(process.execPath,['--check','app.js'],{stdio:'inherit'});
console.log('Sintaxe validada.');
