/* All business writes require a server acknowledgement. There is no local-login fallback. */
const cloud = { setup:false, csrf:'', revision:0, confirmed:null, busy:false, polling:false, pending:null, ready:false };
function cloudDialog(message, initial) {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog'), form=document.createElement('form');
    form.className='auth-form';form.method='dialog';
    const heading=document.createElement('h2');heading.className='ui-dialog-heading';heading.id='action-dialog-title';heading.textContent=initial===undefined?'Confirmar ação':'Informar dados';dialog.setAttribute('aria-labelledby',heading.id);form.append(heading);
    const label=document.createElement('p');label.textContent=message;label.style.whiteSpace='pre-line';form.append(label);
    let input;
    if(initial!==undefined){input=document.createElement('input');input.type='text';input.value=initial;input.setAttribute('aria-label',message);form.append(input);}
    const confirmButton=document.createElement('button');confirmButton.type='submit';confirmButton.textContent='Confirmar';form.append(confirmButton);
    const cancelButton=document.createElement('button');cancelButton.type='button';cancelButton.textContent='Cancelar';form.append(cancelButton);
    const done=value=>{dialog.close();dialog.remove();resolve(value);};
    form.addEventListener('submit',event=>{event.preventDefault();done(input?input.value:true);});
    cancelButton.addEventListener('click',()=>done(input?null:false));
    dialog.addEventListener('cancel',event=>{event.preventDefault();done(input?null:false);});
    dialog.append(form);document.body.append(dialog);dialog.showModal();(input||confirmButton).focus();
  });
}
function cloudConfirm(message){return cloudDialog(message);}
function cloudPrompt(message,initial=''){return cloudDialog(message,initial);}
function cloudStatus(message, error=false) {
  const el=document.querySelector('#cloudMessage');
  if(el) { el.textContent=message; el.classList.toggle('cloud-error',error); }
  document.querySelector('.cloud-bar').dataset.state=error?'error':cloud.busy?'saving':message.startsWith('Conectando')?'loading':'ready';
  document.querySelector('#retryPending')?.classList.toggle('hidden',!cloud.pending);
  document.querySelector('#downloadPending')?.classList.toggle('hidden',!cloud.pending);
  document.querySelector('#discardPending')?.classList.toggle('hidden',!cloud.pending);
}
async function cloudRequest(url,data) {
  const response=await fetch(url,{method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',
    headers:data===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':cloud.csrf},
    body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(20000)});
  const result=await response.json().catch(()=>({error:'O servidor não retornou uma resposta válida.'}));
  if(!response.ok) {
    const error=new Error(result.error || 'Não foi possível concluir a operação.');error.status=response.status;
    if(response.status===401) { currentSession=null; cloud.ready=false; renderAuthGate(); }
    throw error;
  }
  return result;
}
function cloudApply(result) {
  cloud.csrf=result.csrf || cloud.csrf;
  if(result.user) { authState={users:result.users || [result.user]}; saveSession(result.user); }
  if(result.state) {
    state=normalizeState(result.state); cloud.confirmed=clone(state); cloud.revision=result.revision;
  }
}
async function cloudBoot() {
  cloudStatus('Conectando ao servidor…');
  try {
    const result=await cloudRequest('/api/bootstrap');
    cloud.setup=Boolean(result.setup);
    if(result.user) {
      cloudApply(result); cloud.ready=true;
      const raw=sessionStorage.getItem('pjota.pending.'+result.user.id);
      cloud.pending=raw?JSON.parse(raw):null;
      await cloudRefresh(true);
      if(cloud.pending) cloudStatus('Existe uma operação sem confirmação neste dispositivo. Confira antes de continuar.',true);
    } else { cloud.ready=false; renderAuthGate(); cloudStatus(result.setup?'Configure o administrador para iniciar.':'Entre para acessar os dados compartilhados.'); }
    document.querySelector('#reloadCloud').classList.remove('hidden');
  } catch(error) {
    cloud.ready=false; cloudStatus('Sem conexão com o servidor. '+error.message,true); renderAuthGate();
  }
}
async function cloudRefresh(force=false) {
  if(!currentSession || cloud.busy || cloud.polling || (cloud.pending&&!force))return;
  // Leave in-progress form edits untouched. Saving still checks the revision on the server.
  if(!force && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
  cloud.polling=true;
  try {
    const result=await cloudRequest('/api/state'+(force?'':'?since='+cloud.revision));
    if(cloud.busy || (result.revision!==undefined && result.revision<cloud.revision))return;
    if(typeof syncQuickOrderFormFromDom==='function')syncQuickOrderFormFromDom();
    cloudApply(result);
    if(result.state || force)renderAll();
    cloud.ready=true;
    if(!cloud.pending)cloudStatus('Dados confirmados no servidor · versão '+cloud.revision);
  } catch(error) {
    cloudStatus('Conexão interrompida. Aguarde a confirmação antes de repetir uma operação.',true);
    if(force)throw error;
  } finally { cloud.polling=false; }
}
async function cloudMutate(action,data,retry=false) {
  if(cloud.busy)throw new Error('Aguarde a operação atual.');
  if(!currentSession || !cloud.ready)throw new Error('Entre novamente para gravar.');
  if(cloud.pending&&!retry)throw new Error('Resolva a operação pendente antes de continuar.');
  const owner=currentSession.userId;
  const payload=retry?cloud.pending:{requestId:crypto.randomUUID(),revision:cloud.revision,action,data:clone(data)};
  cloud.pending=payload;
  // Recovery draft only: never used as authoritative data or authentication.
  try { sessionStorage.setItem('pjota.pending.'+owner,JSON.stringify(payload)); }
  catch { cloud.pending=null; throw new Error('Não foi possível guardar o rascunho de recuperação. Libere espaço no navegador antes de gravar.'); }
  cloud.busy=true; document.querySelector('.app-shell').inert=true;
  cloudStatus('Salvando no servidor…');
  try {
    const result=await cloudRequest('/api/mutate',payload);
    cloudApply(result);cloud.pending=null;sessionStorage.removeItem('pjota.pending.'+owner);
    cloudStatus('Salvo no servidor · versão '+cloud.revision);return result;
  } catch(error) {
    if(cloud.confirmed)state=clone(cloud.confirmed);
    renderAll();
    cloudStatus(error.status===409?error.message:'Operação sem confirmação. O rascunho está preservado; repetir o envio não duplica a operação.',true);
    error.cloudHandled=true;throw error;
  } finally { cloud.busy=false;document.querySelector('.app-shell').inert=false; }
}
async function authSubmit(url,data,messageSelector) {
  const form=document.querySelector(messageSelector).closest('form'), button=form.querySelector('button[type=submit]');
  button.disabled=true;
  try {
    const result=await cloudRequest(url,data);cloud.csrf=result.csrf;form.reset();
    document.querySelector(messageSelector).textContent='';await cloudBoot();
  } catch(error) { document.querySelector(messageSelector).textContent=error.message; }
  finally {button.disabled=false;}
}
window.addEventListener('unhandledrejection',event=>{
  event.preventDefault();
  if(!event.reason?.cloudHandled)uiNotify(event.reason?.message || 'Não foi possível concluir esta operação.');
});
window.addEventListener('beforeunload',event=>{if(cloud.busy||cloud.pending){event.preventDefault();event.returnValue='';}});
window.addEventListener('online',()=>cloudRefresh(true).catch(()=>{}));
window.addEventListener('DOMContentLoaded',()=>{
  document.querySelector('#reloadCloud').addEventListener('click',()=>cloudBoot());
  document.querySelector('#retryPending').addEventListener('click',async()=>{await cloudMutate(null,null,true);renderAll();});
  document.querySelector('#downloadPending').addEventListener('click',()=>{
    const data=cloud.pending.action.startsWith('state.')?cloud.pending.data:cloud.pending;
    downloadText('pjotabuguer-rascunho-nao-confirmado.json',JSON.stringify(data,null,2),'application/json');
  });
  document.querySelector('#discardPending').addEventListener('click',async()=>{
    if(!await cloudConfirm('Já conferiu ou baixou o rascunho? Esta ação descarta apenas a tentativa local e carrega os dados atuais do servidor.'))return;
    sessionStorage.removeItem('pjota.pending.'+currentSession.userId);cloud.pending=null;await cloudRefresh(true);
  });
  document.querySelector('#migrateLocal').addEventListener('click',async()=>{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return uiNotify('Não há dados antigos neste endereço. Use Importar backup JSON.');
    const parsed=JSON.parse(raw);
    if(!validateBackup(parsed))throw new Error('Os dados locais não têm um formato reconhecido.');
    downloadText('pjotabuguer-original-antes-da-migracao.json',raw,'application/json');
    if(!await cloudConfirm('O backup original foi baixado. Importar os dados deste navegador para todos os dispositivos? A versão atual do servidor ficará no histórico.'))return;
    await cloudMutate('state.import',normalizeState(parsed));renderAll();
    uiNotify('Migração confirmada. A cópia antiga do navegador foi preservada.');
  });
  document.querySelector('#recoverVersion').addEventListener('click',async()=>{
    const history=await cloudRequest('/api/history');
    if(!history.length)return uiNotify('Ainda não existem versões anteriores.');
    const choice=await cloudPrompt('Versões recentes:\n'+history.slice(0,15).map(h=>h.revision+' — '+new Date(h.created_at).toLocaleString('pt-BR')+' — '+h.reason).join('\n')+'\n\nNúmero da versão a restaurar:');
    if(choice===null||!/^\d+$/.test(choice))return;
    if(!await cloudConfirm('Restaurar a versão '+choice+'? A versão atual também ficará no histórico.'))return;
    await cloudMutate('state.restore',{revision:Number(choice)});renderAll();
  });
  document.querySelector('#forgotPassword').addEventListener('click',async()=>{
    const email=document.querySelector('#loginEmail').value;
    if(!email)return uiNotify('Preencha o email de acesso.');
    const result=await cloudRequest('/api/auth/forgot',{email});uiNotify(result.message);
  });
  document.querySelector('#changePassword').addEventListener('click',()=>document.querySelector('#passwordDialog').showModal());
  document.querySelector('#cancelPassword').addEventListener('click',()=>document.querySelector('#passwordDialog').close());
  document.querySelector('#passwordForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const next=document.querySelector('#newPassword').value;
    if(next!==document.querySelector('#confirmPassword').value)return uiNotify('As senhas não coincidem.');
    await cloudRequest('/api/password',{current:document.querySelector('#currentPassword').value,password:next});
    event.target.reset();document.querySelector('#passwordDialog').close();clearSession();await cloudBoot();uiNotify('Senha alterada. Entre novamente.');
  });
  const access=new URLSearchParams(location.hash.slice(1));
  if(access.has('setup')){
    document.querySelector('#setupKey').value=access.get('setup');
    document.querySelector('#setupEmail').value=access.get('email') || '';
    document.querySelector('#setupName').value=access.get('name') || '';
    history.replaceState(null,'',location.pathname);
  }
  const reset=access.get('reset');
  if(reset){
    history.replaceState(null,'',location.pathname);document.querySelector('#resetDialog').showModal();
    document.querySelector('#resetForm').addEventListener('submit',async event=>{
      event.preventDefault();const next=document.querySelector('#resetPassword').value;
      if(next!==document.querySelector('#resetConfirm').value)return uiNotify('As senhas não coincidem.');
      await cloudRequest('/api/auth/reset',{token:reset,password:next});event.target.reset();document.querySelector('#resetDialog').close();uiNotify('Senha redefinida. Entre com a nova senha.');
    });
  }
});
