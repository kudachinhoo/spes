/* Mapa geral SPES — recebe as ocorrências já carregadas na home.
   Espera localizacoes: [{latitude, longitude, ordem}, ...] na resposta GET /api/people.
*/
(() => {
  'use strict';
  let mapa, camada, iniciou = false;
  const aviso = () => document.getElementById('spes-mapa-aviso');
  const quantidade = () => document.getElementById('spes-mapa-quantidade');
  const fotoPadrao = 'Imagens do site/placeholder.png';

  function fotoPublica(pessoa) {
    let valor = pessoa.foto;
    if (Array.isArray(pessoa.fotos) && pessoa.fotos.length) {
      const primeira = pessoa.fotos[0];
      valor = typeof primeira === 'string' ? primeira : (primeira?.url || primeira?.foto || valor);
    }
    if (typeof valor === 'string' && (/^https:\/\//i.test(valor) || /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(valor))) return valor;
    return fotoPadrao;
  }
  function pontosDaPessoa(pessoa) {
    let lista = pessoa.localizacoes || pessoa.pontos_localizacao || pessoa.pontosLocalizacao || [];
    if (typeof lista === 'string') { try { lista = JSON.parse(lista); } catch { lista = []; } }
    if (!Array.isArray(lista)) return [];
    return lista.map((p) => ({
      lat: Number(p.latitude ?? p.lat), lng: Number(p.longitude ?? p.lng), ordem: Number(p.ordem ?? 0)
    })).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 && !(p.lat === 0 && p.lng === 0))
      .sort((a,b) => a.ordem - b.ordem).slice(0,3);
  }
  function iniciar() {
    if (iniciou) return true;
    if (!window.L) { if (aviso()) aviso().textContent = 'Não foi possível carregar a biblioteca do mapa.'; return false; }
    mapa = L.map('spes-mapa-geral', {scrollWheelZoom:false}).setView([-14.2,-51.9],4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19, attribution:'&copy; OpenStreetMap contributors'
    }).addTo(mapa);
    camada = L.featureGroup().addTo(mapa);
    iniciou = true;
    setTimeout(() => mapa.invalidateSize(), 100);
    return true;
  }
  function popup(pessoa, foto) {
    const box = document.createElement('div'); box.className = 'spes-mapa-popup';
    const img = document.createElement('img'); img.src = foto; img.alt = 'Foto da pessoa cadastrada';
    img.onerror = () => { img.onerror = null; img.src = fotoPadrao; };
    const nome = document.createElement('strong'); nome.textContent = pessoa.nome || 'Nome não informado';
    const local = document.createElement('p'); local.textContent = [pessoa.cidade, pessoa.estado_desaparecimento].filter(Boolean).join(' - ') || 'Local não informado';
    box.append(img,nome,local);
    const id = pessoa.id_desaparecido ?? pessoa.id;
    if (id !== undefined && id !== null) {
      const link = document.createElement('a'); link.textContent = 'Ver detalhes';
      link.href = 'detalhes.html?id=' + encodeURIComponent(String(id)); box.append(link);
    }
    return box;
  }
  window.atualizarMapaSPES = (pessoas) => {
    if (!iniciar()) return;
    camada.clearLayers(); let total = 0;
    for (const pessoa of pessoas) {
      const pts = pontosDaPessoa(pessoa);
      if (pts.length !== 3) continue;
      // Evita triângulos degenerados (três pontos alinhados).
      const area = (pts[1].lng-pts[0].lng)*(pts[2].lat-pts[0].lat)-(pts[2].lng-pts[0].lng)*(pts[1].lat-pts[0].lat);
      if (Math.abs(area) < 1e-10) continue;
      const coordenadas = pts.map(p => [p.lat,p.lng]);
      L.polygon(coordenadas, {color:'#d32f2f',weight:2,fillColor:'#e74c3c',fillOpacity:.16}).addTo(camada);
      const centro = [pts.reduce((s,p)=>s+p.lat,0)/3, pts.reduce((s,p)=>s+p.lng,0)/3];
      const foto = fotoPublica(pessoa);
      const icon = L.divIcon({className:'',html:'<div class="spes-mapa-foto-marcador"><img alt="" src="'+foto.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')+'"></div>',iconSize:[54,54],iconAnchor:[27,27]});
      L.marker(centro,{icon, title:pessoa.nome || 'Ocorrência'}).bindPopup(popup(pessoa,foto),{maxWidth:250}).addTo(camada);
      total++;
    }
    if (quantidade()) quantidade().textContent = total + (total === 1 ? ' área no mapa' : ' áreas no mapa');
    if (aviso()) aviso().textContent = total ? 'Clique na foto para consultar a ocorrência. As áreas indicam somente os pontos cadastrados.' : 'Nenhuma ocorrência desta lista possui três coordenadas disponíveis. Confira se a API pública retorna o campo localizacoes.';
    if (total) mapa.fitBounds(camada.getBounds().pad(.22), {maxZoom:13});
    else mapa.setView([-14.2,-51.9],4);
  };
  window.erroMapaSPES = () => {if(aviso()) aviso().textContent='Não foi possível carregar os dados do mapa.';};
})();
