/* ==========================================================
   SPES — MAPA GERAL COM TRIANGULAÇÕES COLORIDAS
   Distribuição inteligente de cores por proximidade geográfica
   e sobreposição dos triângulos.
   ========================================================== */

(() => {
  'use strict';

  let mapa;
  let camada;
  let iniciou = false;

  const aviso = () => document.getElementById('spes-mapa-aviso');
  const quantidade = () => document.getElementById('spes-mapa-quantidade');

  const fotoPadrao = 'Imagens do site/placeholder.png';

  // ==========================================================
  // FOTOGRAFIAS
  // ==========================================================

  function fotoPublica(pessoa) {
    let valor = pessoa.foto;

    if (Array.isArray(pessoa.fotos) && pessoa.fotos.length) {
      const primeira = pessoa.fotos[0];

      valor = typeof primeira === 'string'
        ? primeira
        : (primeira?.url || primeira?.foto || valor);
    }

    if (
      typeof valor === 'string' &&
      (
        /^https:\/\//i.test(valor) ||
        /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(valor)
      )
    ) {
      return valor;
    }

    return fotoPadrao;
  }

  // ==========================================================
  // COORDENADAS
  // ==========================================================

  function pontosDaPessoa(pessoa) {
    let lista =
      pessoa.localizacoes ||
      pessoa.pontos_localizacao ||
      pessoa.pontosLocalizacao ||
      [];

    if (typeof lista === 'string') {
      try {
        lista = JSON.parse(lista);
      } catch {
        lista = [];
      }
    }

    if (!Array.isArray(lista)) return [];

    return lista
      .map(p => ({
        lat: Number(p.latitude ?? p.lat),
        lng: Number(p.longitude ?? p.lng),
        ordem: Number(p.ordem ?? 0)
      }))
      .filter(p =>
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lng) &&
        Math.abs(p.lat) <= 90 &&
        Math.abs(p.lng) <= 180 &&
        !(p.lat === 0 && p.lng === 0)
      )
      .sort((a, b) => a.ordem - b.ordem)
      .slice(0, 3);
  }

  // ==========================================================
  // GEOMETRIA
  // ==========================================================

  function centroTriangulo(pontos) {
    return [
      pontos.reduce((s, p) => s + p.lat, 0) / 3,
      pontos.reduce((s, p) => s + p.lng, 0) / 3
    ];
  }

  function distanciaKm(a, b) {
    const rad = Math.PI / 180;
    const dLat = (b[0] - a[0]) * rad;
    const dLng = (b[1] - a[1]) * rad;

    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(a[0] * rad) *
      Math.cos(b[0] * rad) *
      Math.sin(dLng / 2) ** 2;

    return 6371 * 2 * Math.atan2(
      Math.sqrt(x),
      Math.sqrt(Math.max(0, 1 - x))
    );
  }

  function orientacao(a, b, c) {
    return (
      (b.lng - a.lng) * (c.lat - a.lat) -
      (b.lat - a.lat) * (c.lng - a.lng)
    );
  }

  function pontoNoTriangulo(p, tri) {
    const a = orientacao(tri[0], tri[1], p);
    const b = orientacao(tri[1], tri[2], p);
    const c = orientacao(tri[2], tri[0], p);

    const negativo = a < 0 || b < 0 || c < 0;
    const positivo = a > 0 || b > 0 || c > 0;

    return !(negativo && positivo);
  }

  function segmentosCruzam(a, b, c, d) {
    const o1 = orientacao(a, b, c);
    const o2 = orientacao(a, b, d);
    const o3 = orientacao(c, d, a);
    const o4 = orientacao(c, d, b);

    return (
      (o1 > 0 && o2 < 0 || o1 < 0 && o2 > 0) &&
      (o3 > 0 && o4 < 0 || o3 < 0 && o4 > 0)
    );
  }

  function triangulosSobrepostos(t1, t2) {
    // Um vértice de um triângulo dentro do outro.
    if (t1.some(p => pontoNoTriangulo(p, t2))) return true;
    if (t2.some(p => pontoNoTriangulo(p, t1))) return true;

    // Cruzamento entre as arestas.
    for (let i = 0; i < 3; i++) {
      const a = t1[i];
      const b = t1[(i + 1) % 3];

      for (let j = 0; j < 3; j++) {
        const c = t2[j];
        const d = t2[(j + 1) % 3];

        if (segmentosCruzam(a, b, c, d)) {
          return true;
        }
      }
    }

    return false;
  }

  // ==========================================================
  // SISTEMA INTELIGENTE DE CORES
  // ==========================================================

  const ANGULO_AUREO = 137.507764;

  function hashId(id) {
    const texto = String(id ?? '');

    let hash = 2166136261;

    for (let i = 0; i < texto.length; i++) {
      hash ^= texto.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  function diferencaTonal(a, b) {
    const d = Math.abs(a - b);
    return Math.min(d, 360 - d);
  }

  function criarCandidatos(id) {
    const candidatos = [];
    const deslocamento = hashId(id) % 360;

    // 72 tons distribuídos pelo círculo cromático.
    for (let i = 0; i < 72; i++) {
      candidatos.push(
        (deslocamento + i * ANGULO_AUREO) % 360
      );
    }

    return candidatos;
  }

  function distribuirCores(ocorrencias) {
    const cores = new Map();
    const processadas = [];

    // Mantém uma ordem previsível.
    const ordenadas = [...ocorrencias].sort((a, b) =>
      String(a.id).localeCompare(String(b.id), 'pt-BR', {
        numeric: true
      })
    );

    for (const atual of ordenadas) {
      const candidatos = criarCandidatos(atual.id);

      let melhorHue = candidatos[0];
      let melhorPontuacao = -Infinity;

      for (const hue of candidatos) {
        let menorContraste = Infinity;
        let encontrouVizinho = false;

        for (const anterior of processadas) {
          const sobrepostos = triangulosSobrepostos(
            atual.pontos,
            anterior.pontos
          );

          const distancia = distanciaKm(
            atual.centro,
            anterior.centro
          );

          // Prioriza sobreposição e proximidade de até 30 km.
          if (!sobrepostos && distancia > 30) {
            continue;
          }

          encontrouVizinho = true;

          const contraste = diferencaTonal(
            hue,
            anterior.hue
          );

          // Triângulos sobrepostos têm prioridade maior.
          const peso = sobrepostos
            ? 3
            : 1 / (1 + distancia / 10);

          const pontuacao = contraste * peso;

          menorContraste = Math.min(
            menorContraste,
            pontuacao
          );
        }

        const pontuacaoFinal = encontrouVizinho
          ? menorContraste
          : diferencaTonal(
              hue,
              hashId(atual.id) % 360
            );

        if (pontuacaoFinal > melhorPontuacao) {
          melhorPontuacao = pontuacaoFinal;
          melhorHue = hue;
        }
      }

      processadas.push({
        id: atual.id,
        pontos: atual.pontos,
        centro: atual.centro,
        hue: melhorHue
      });

      cores.set(
        String(atual.id),
        `hsl(${melhorHue.toFixed(2)}, 82%, 42%)`
      );
    }

    return cores;
  }

  // ==========================================================
  // INICIALIZAÇÃO DO MAPA
  // ==========================================================

  function iniciar() {
    if (iniciou) return true;

    if (!window.L) {
      if (aviso()) {
        aviso().textContent =
          'Não foi possível carregar a biblioteca do mapa.';
      }

      return false;
    }

    mapa = L.map('spes-mapa-geral', {
      scrollWheelZoom: false
    }).setView([-14.2, -51.9], 4);

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }
    ).addTo(mapa);

    camada = L.featureGroup().addTo(mapa);

    iniciou = true;

    setTimeout(() => mapa.invalidateSize(), 100);

    return true;
  }

  // ==========================================================
  // CARD DE INFORMAÇÕES
  // ==========================================================

  function popup(pessoa, foto) {
    const box = document.createElement('div');
    box.className = 'spes-mapa-popup';

    const img = document.createElement('img');
    img.src = foto;
    img.alt = 'Foto da pessoa cadastrada';

    img.onerror = () => {
      img.onerror = null;
      img.src = fotoPadrao;
    };

    const nome = document.createElement('strong');
    nome.textContent = pessoa.nome || 'Nome não informado';

    const local = document.createElement('p');

    local.textContent = [
      pessoa.cidade,
      pessoa.estado_desaparecimento
    ].filter(Boolean).join(' - ') || 'Local não informado';

    box.append(img, nome, local);

    const id = pessoa.id_desaparecido ?? pessoa.id;

    if (id !== undefined && id !== null) {
      const link = document.createElement('a');
      link.textContent = 'Ver detalhes';

      link.href =
        'detalhes.html?id=' +
        encodeURIComponent(String(id));

      box.append(link);
    }

    return box;
  }

  // ==========================================================
  // ATUALIZAÇÃO DO MAPA
  // ==========================================================

  window.atualizarMapaSPES = pessoas => {
    if (!iniciar()) return;

    camada.clearLayers();

    const ocorrencias = [];

    for (const pessoa of pessoas || []) {
      const pontos = pontosDaPessoa(pessoa);

      if (pontos.length !== 3) continue;

      // Evita triângulos com três pontos alinhados.
      const area = orientacao(
        pontos[0],
        pontos[1],
        pontos[2]
      );

      if (Math.abs(area) < 1e-10) continue;

      ocorrencias.push({
        id: pessoa.id_desaparecido ?? pessoa.id,
        pessoa,
        pontos,
        centro: centroTriangulo(pontos)
      });
    }

    // Calcula as cores considerando todas as ocorrências.
    const cores = distribuirCores(ocorrencias);

    for (const ocorrencia of ocorrencias) {
      const { id, pessoa, pontos, centro } = ocorrencia;

      const cor =
        cores.get(String(id)) || '#2563EB';

      const coordenadas = pontos.map(p => [
        p.lat,
        p.lng
      ]);

      // TRIÂNGULO
      const triangulo = L.polygon(coordenadas, {
        color: cor,
        weight: 2.5,
        opacity: 0.9,
        fillColor: cor,
        fillOpacity: 0.14
      }).addTo(camada);

      const foto = fotoPublica(pessoa);

      // Ao passar o mouse, destaca a área.
      triangulo.on('mouseover', function () {
        this.setStyle({
          weight: 4,
          opacity: 1,
          fillOpacity: 0.35
        });

        this.bringToFront();
      });

      triangulo.on('mouseout', function () {
        this.setStyle({
          weight: 2.5,
          opacity: 0.9,
          fillOpacity: 0.14
        });
      });

      // Permite abrir o card clicando no triângulo.
      triangulo.bindPopup(
        popup(pessoa, foto),
        { maxWidth: 250 }
      );

      // MARCADOR COM FOTOGRAFIA
      const corBorda = cor.replaceAll('"', '&quot;');

      const fotoSegura = foto
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');

      const icon = L.divIcon({
        className: '',
        html: `
          <div
            class="spes-mapa-foto-marcador"
            style="border: 4px solid ${corBorda};"
          >
            <img alt="" src="${fotoSegura}">
          </div>
        `,
        iconSize: [54, 54],
        iconAnchor: [27, 27]
      });

      L.marker(centro, {
        icon,
        title: pessoa.nome || 'Ocorrência'
      })
        .bindPopup(
          popup(pessoa, foto),
          { maxWidth: 250 }
        )
        .addTo(camada);
    }

    const total = ocorrencias.length;

    if (quantidade()) {
      quantidade().textContent =
        total +
        (total === 1
          ? ' área no mapa'
          : ' áreas no mapa');
    }

    if (aviso()) {
      aviso().textContent = total
        ? 'Clique na fotografia ou no triângulo para consultar a ocorrência. As áreas representam apenas os pontos cadastrados.'
        : 'Nenhuma ocorrência desta lista possui três coordenadas disponíveis.';
    }

    if (total) {
      mapa.fitBounds(
        camada.getBounds().pad(0.22),
        { maxZoom: 13 }
      );
    } else {
      mapa.setView([-14.2, -51.9], 4);
    }
  };

  window.erroMapaSPES = () => {
    if (aviso()) {
      aviso().textContent =
        'Não foi possível carregar os dados do mapa.';
    }
  };
})();
