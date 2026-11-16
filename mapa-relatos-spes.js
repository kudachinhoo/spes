(() => {
 'use strict';
 const PREFIXO = 'Coordenadas: ';
 const validar = (lat,lng) => typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat)<=90 && Math.abs(lng)<=180;
 function ler(valor) {
  const m = /^Coordenadas: (-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)$/.exec(valor || '');
  if(!m) return null; const lat=Number(m[1]),lng=Number(m[2]); return validar(lat,lng)?{lat,lng}:null;
 }
 function estilo(satelite=false){return {version:8,sources:{esri:{type:'raster',tiles:[satelite?'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}':'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'],tileSize:256,attribution:'Esri and contributors'}},layers:[{id:'base',type:'raster',source:'esri'}]};}
 function criar(container,center,zoom){
  const mapa=new maplibregl.Map({container,style:estilo(),center,zoom,attributionControl:true});
  mapa.addControl(new maplibregl.NavigationControl(),'top-right');return mapa;
 }
 window.SPESRelatoMapa = {
  ler,
  mostrar(card,valor){
   const ponto=ler(valor);if(!ponto)return;
   const sec=document.createElement('section');sec.className='relato-localizacao';
   const titulo=document.createElement('p');titulo.textContent='Local aproximado informado no relato';
   const div=document.createElement('div');div.className='relato-mapa relato-mapa-leitura';div.setAttribute('aria-label','Mapa do local informado no relato');
   sec.append(titulo,div);card.append(sec);
   const aviso=document.createElement('p');aviso.className='relato-mapa-estado';sec.append(aviso);
   if(!window.maplibregl){aviso.textContent='Mapa indisponível. '+valor;return;}
   // Os cartões são montados antes de serem inseridos na página.
   requestAnimationFrame(()=>{
    if(!div.isConnected)return;
    try{const mapa=criar(div,[ponto.lng,ponto.lat],15);mapa.scrollZoom.disable();new maplibregl.Marker({color:'#1e5b8c'}).setLngLat([ponto.lng,ponto.lat]).addTo(mapa);
     const observer=new MutationObserver(()=>{if(!div.isConnected){observer.disconnect();mapa.remove();}});observer.observe(document.body,{childList:true,subtree:true});
     mapa.on('error',()=>{aviso.textContent='Não foi possível carregar o mapa. '+valor;});
    }catch(e){aviso.textContent='Mapa indisponível. '+valor;}
   });
  }
 };
 function iniciarSeletor(){
 const container=document.getElementById('mapa-relato');if(!container)return;
 const campo=document.getElementById('local'),status=document.getElementById('mapa-relato-status');
 if(!window.maplibregl){status.textContent='Não foi possível carregar o mapa. Recarregue a página ou envie o relato sem localização.';return;}
 let mapa,marcador;
 try{mapa=criar(container,[-47.9292,-15.7801],3.5);}catch(e){status.textContent='Mapa indisponível. Você pode enviar o relato sem localização.';return;}
 const ruas=document.getElementById('relato-ruas'),satelite=document.getElementById('relato-satelite');
 function selecionar(lat,lng){
  lng=((lng+180)%360+360)%360-180;
  if(!validar(lat,lng))return;
  campo.value=PREFIXO+lat.toFixed(6)+', '+lng.toFixed(6);
  if(!marcador){marcador=new maplibregl.Marker({draggable:true,color:'#1e5b8c'}).setLngLat([lng,lat]).addTo(mapa);marcador.on('dragend',()=>{const pos=marcador.getLngLat();selecionar(pos.lat,pos.lng);});}
  else marcador.setLngLat([lng,lat]);
  status.textContent='Local selecionado: '+lat.toFixed(6)+', '+lng.toFixed(6)+'. Clique em outro lugar ou arraste o marcador para ajustar.';
 }
 mapa.on('click',e=>selecionar(e.lngLat.lat,e.lngLat.lng));
 mapa.on('error',()=>{status.textContent='Houve uma falha ao carregar o mapa. Confira a conexão. Você pode enviar o relato sem localização.';});
 function camada(sat){mapa.setStyle(estilo(sat));ruas.setAttribute('aria-pressed',String(!sat));satelite.setAttribute('aria-pressed',String(sat));}
 ruas.onclick=()=>camada(false);satelite.onclick=()=>camada(true);
 function limpar(){campo.value='';if(marcador){marcador.remove();marcador=null;}status.textContent='Nenhum local selecionado. Clique no mapa para marcar o local aproximado (opcional).';}
 document.getElementById('relato-limpar-local').onclick=limpar;
 const geo=new maplibregl.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:false,showUserLocation:true});mapa.addControl(geo,'top-right');
 geo.on('geolocate',()=>{if(!campo.value)status.textContent='Mapa centralizado na sua posição. Clique no local do avistamento para confirmar o ponto.';});
 geo.on('error',()=>{status.textContent='Não foi possível obter sua posição. Você pode navegar no mapa e marcar o local manualmente.';});
 document.getElementById('relatoForm').addEventListener('reset',limpar);
 status.textContent='Clique no mapa para marcar o local aproximado. Use + e − para aproximar ou afastar.';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciarSeletor,{once:true});else iniciarSeletor();
})();