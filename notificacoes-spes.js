(() => {
 'use strict';
 const area = document.getElementById('areaUsuario');
 if (!area || !localStorage.getItem('token')) return;
 const base = 'https://spes-backend.onrender.com/api';
 // A visibilidade usa o perfil confirmado pela API; as rotas continuam protegidas no servidor.
 async function mostrarPainelAdmin() {
  const currentToken = localStorage.getItem('token');
  try {
   const response = await fetch(base + '/auth/profile', { headers: { Authorization: 'Bearer ' + currentToken } });
   if (!response.ok) return;
   const profile = await response.json();
   if (profile.papel !== 'admin' || localStorage.getItem('token') !== currentToken || document.getElementById('spes-link-admin')) return;
   const link = document.createElement('a');
   link.id = 'spes-link-admin'; link.className = 'spes-link-admin';
   link.href = 'Admin.html'; link.textContent = 'Painel admin';
   area.append(link);
  } catch (error) { console.warn('Não foi possível verificar o acesso ao painel administrativo.'); }
 }
 mostrarPainelAdmin();

 const host = document.createElement('div'); host.className = 'spes-notificacoes';
 const bell = document.createElement('button'); bell.type = 'button'; bell.className = 'spes-sino'; bell.setAttribute('aria-label','Notificações'); bell.setAttribute('aria-expanded','false'); bell.setAttribute('aria-controls','spes-painel-notificacoes');
 bell.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>';
 const badge = document.createElement('span'); badge.className = 'spes-contador'; badge.hidden = true; bell.append(badge);
 const panel = document.createElement('section'); panel.className = 'spes-painel'; panel.id = 'spes-painel-notificacoes'; panel.hidden = true; panel.setAttribute('aria-label','Notificações');
 const title = document.createElement('h2'); title.textContent = 'Notificações';
 const all = document.createElement('button'); all.type = 'button'; all.textContent = 'Marcar todas como lidas';
 const status = document.createElement('p'); status.setAttribute('role','status');
 const list = document.createElement('div'); panel.append(title,all,status,list); host.append(bell,panel);
 const name = document.getElementById('nomeUsuario'); if(name) name.after(host); else area.prepend(host);
 let busy = false;
 async function api(url, method='GET') {
  const token = localStorage.getItem('token'); if(!token) { host.hidden=true; throw Error('Entre na sua conta.'); }
  const r = await fetch(base+url,{method,headers:{Authorization:'Bearer '+token}});
  const d = await r.json().catch(()=>({})); if(!r.ok) throw Error(d.error || 'Não foi possível carregar as notificações.'); return d;
 }
 async function refresh(){
  if(busy || document.hidden) return; busy=true;
  try {const data=await api('/notificacoes'); badge.hidden=!data.nao_lidas; badge.textContent=data.nao_lidas>99?'99+':String(data.nao_lidas); bell.setAttribute('aria-label','Notificações: '+data.nao_lidas+' não lidas');
   all.disabled=!data.nao_lidas; status.textContent=data.itens.length?'Últimas notificações':'Você ainda não tem notificações.'; list.replaceChildren();
   for(const item of data.itens){const b=document.createElement('button');b.type='button';b.className='spes-item';b.dataset.lida=String(Boolean(item.lida_em));b.textContent='Ocorrência #'+item.id_desaparecido+' · '+item.mensagem;
    const time=document.createElement('small');time.textContent=new Date(item.criado_em).toLocaleString('pt-BR');b.append(time);
    b.onclick=async()=>{b.disabled=true;try{await api('/notificacoes/'+item.id+'/lida','PATCH');if(item.tipo==='exclusao'){await refresh();return;}const query=new URLSearchParams({ocorrencia:String(item.id_desaparecido),aba:item.tipo.startsWith('relato_')?'relatos':'historico'});location.href='Minhas ocorrencias.html?'+query;}catch(e){status.textContent=e.message;b.disabled=false;}};list.append(b);}
  }catch(e){status.textContent=e.message;}finally{busy=false;}
 }
 bell.onclick=()=>{panel.hidden=!panel.hidden;bell.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)refresh();};
 all.onclick=async()=>{all.disabled=true;try{await api('/notificacoes/ler-todas','PATCH');await refresh();}catch(e){status.textContent=e.message;all.disabled=false;}};
 document.addEventListener('click',e=>{if(!host.contains(e.target)){panel.hidden=true;bell.setAttribute('aria-expanded','false');}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){panel.hidden=true;bell.setAttribute('aria-expanded','false');bell.focus();}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 window.addEventListener('spes:movimentacao',refresh);
 refresh();setInterval(refresh,30000);
})();
