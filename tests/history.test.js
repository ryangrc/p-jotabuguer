const {test}=require('node:test'),assert=require('node:assert/strict');
const {inverse,rewind}=require('../cloud/history'),{emptyState}=require('../cloud/domain');
test('recuperação incremental preserva inclusão, exclusão, ordem e todos os campos',()=>{
 const a=emptyState();a.ingredients=[{id:'a',stock:1},{id:'b',stock:2},{id:'c',stock:3}];a.settings={name:'Antigo'};
 const b=structuredClone(a);b.ingredients=[{id:'c',stock:9},{id:'x',stock:3},{id:'a',stock:1}];b.settings={name:'Novo'};
 assert.deepEqual(rewind(b,inverse(a,b)),a);
 const c=structuredClone(b);c.ingredients.push({id:'z',stock:1});
 assert.deepEqual(rewind(rewind(c,inverse(b,c)),inverse(a,b)),a);
});
