// "Voltar" (no topo e no fim): quem chegou pela vitrine de uma confeitaria volta para a loja dela, não para a página do
// Doce Agenda. Se a política abriu numa aba nova (o aviso do pedido abre assim), o caminho é fechar a aba.
(() => {
  try {
    const from = document.referrer ? new URL(document.referrer) : null;
    if (!from || from.origin !== location.origin || !/^\/(p|encomenda)\//.test(from.pathname)) return;
    for (const link of [document.getElementById('back-link'), document.getElementById('top-back')]) {
      link.href = from.pathname + from.search;
      link.textContent = 'Voltar à loja';
    }
    if (history.length === 1) document.getElementById('tab-note').hidden = false;
  } catch { /* fica o link para o Doce Agenda */ }
})();
// Link com âncora (#conta, vindo do cadastro): o navegador pula antes da letra carregar; quando ela chega o texto muda
// de altura e o título sai do lugar. Pula de novo depois que a letra chegou.
if (location.hash.length > 1) {
  document.fonts?.ready.then(() => {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) target.scrollIntoView();
  });
}
