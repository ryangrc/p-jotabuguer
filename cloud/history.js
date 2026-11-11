const { arrays }=require('./domain');
// Store inverse changes, not a complete database copy for every order.
// This keeps recovery proportional to the records changed by an operation.
function inverse(before,after){
 const patch={format:'inverse-v1',lists:{}};
 for(const key of arrays){
  const old=before[key]||[],next=after[key]||[];
  const oldMap=new Map(old.map((row,index)=>[row.id,{row,index}]));
  const nextMap=new Map(next.map((row,index)=>[row.id,{row,index}]));
  const remove=next.filter(row=>!oldMap.has(row.id)).map(row=>row.id);
  const restore=[];
  for(const [id,entry]of oldMap){
   const changed=nextMap.get(id);
   if(!changed || changed.index!==entry.index || JSON.stringify(changed.row)!==JSON.stringify(entry.row))restore.push(entry);
  }
  if(remove.length||restore.length)patch.lists[key]={remove,restore};
 }
 if(JSON.stringify(before.settings)!==JSON.stringify(after.settings))patch.settings=before.settings;
 return patch;
}
function rewind(current,patch){
 if(patch.format!=='inverse-v1')return structuredClone(patch); // Earlier full snapshots remain readable.
 const state=structuredClone(current);
 for(const [key,delta]of Object.entries(patch.lists)){
  const remove=new Set([...delta.remove,...delta.restore.map(e=>e.row.id)]);
  const rows=state[key].filter(r=>!remove.has(r.id));
  for(const entry of [...delta.restore].sort((a,b)=>a.index-b.index))rows.splice(entry.index,0,structuredClone(entry.row));
  state[key]=rows;
 }
 if(Object.hasOwn(patch,'settings'))state.settings=structuredClone(patch.settings);
 return state;
}
module.exports={inverse,rewind};
