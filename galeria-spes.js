/* Galeria SPES: fotos passam a cada 4 segundos; mouse e foco pausam. */
(function () {
  const valido = s => typeof s === 'string' && (/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i.test(s) || /^https:\/\//i.test(s));
  window.criarGaleriaSPES = function (pessoa, fallback, nome) {
    const fotos = (Array.isArray(pessoa.fotos) ? pessoa.fotos : []).filter(valido);
    if (!fotos.length && valido(pessoa.foto)) fotos.push(pessoa.foto);
    if (!fotos.length) fotos.push(fallback);
    const box = document.createElement('div'); box.className = 'spes-galeria';
    const img = document.createElement('img'); img.className = 'desaparecidos';
    img.alt = 'Foto de ' + (nome || 'pessoa desaparecida'); img.loading = 'lazy';
    img.src = fotos[0]; img.onerror = () => { img.onerror = null; img.src = fallback; };
    box.append(img);
    if (fotos.length === 1) return box;
    let atual = 0, timer;
    const contador = document.createElement('span'); contador.className = 'spes-contador';
    function mostrar(i) { atual = (i + fotos.length) % fotos.length; img.src = fotos[atual]; contador.textContent = `${atual + 1} / ${fotos.length}`; }
    for (const [rotulo, passo, classe] of [['Foto anterior',-1,'anterior'],['Próxima foto',1,'proxima']]) {
      const botao = document.createElement('button'); botao.type = 'button'; botao.className = 'spes-seta ' + classe;
      botao.textContent = passo < 0 ? '❮' : '❯'; botao.setAttribute('aria-label', rotulo);
      botao.onclick = e => { e.preventDefault(); e.stopPropagation(); mostrar(atual + passo); };
      box.append(botao);
    }
    box.append(contador); mostrar(0);
    const parar = () => { if (timer) clearInterval(timer); timer = null; };
    const iniciar = () => { parar(); if (!matchMedia('(prefers-reduced-motion: reduce)').matches && box.isConnected) timer = setInterval(() => mostrar(atual + 1), 4000); };
    box.addEventListener('mouseenter', parar); box.addEventListener('mouseleave', iniciar);
    box.addEventListener('focusin', parar); box.addEventListener('focusout', e => { if (!box.contains(e.relatedTarget)) iniciar(); });
    document.addEventListener('visibilitychange', () => document.hidden ? parar() : iniciar());
    // Só inicia depois de anexado ao documento; para quando removido.
    const observer = new MutationObserver(() => { if (box.isConnected) { observer.disconnect(); iniciar(); } });
    observer.observe(document.body, {childList:true,subtree:true});
    return box;
  };
})();
