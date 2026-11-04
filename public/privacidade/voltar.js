// "Voltar": quem chegou pela vitrine de uma confeitaria volta para a loja dela, não para a página do Doce Agenda.
(() => {
  try {
    const from = document.referrer ? new URL(document.referrer) : null;
    if (!from || from.origin !== location.origin || !/^\/(p|encomenda)\//.test(from.pathname)) return;
    const link = document.getElementById('back-link');
    link.href = from.pathname + from.search;
    link.textContent = 'Voltar à loja';
  } catch { /* fica o link para o Doce Agenda */ }
})();
