(() => {
  const params = new URLSearchParams(window.location.search);
  const selected = params.get('variante') === 'combinado' ? 'combinado' : 'capacidade';

  document.querySelectorAll('[data-variant]').forEach((item) => {
    item.hidden = item.dataset.variant !== selected;
  });
  document.querySelectorAll('[data-variant-link]').forEach((link) => {
    if (link.dataset.variantLink === selected) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  const choose = document.getElementById('choose-sunday');
  const reset = document.getElementById('reset-example');
  const resultTitle = document.getElementById('result-title');
  const resultCopy = document.getElementById('result-copy');
  const status = document.getElementById('live-status');
  if (!choose || !reset || !resultTitle || !resultCopy || !status) return;

  const initialTitle = 'A solicitação continua para revisar';
  const initialCopy = 'O sábado segue com 2 de 2 pedidos. A solicitação ainda não foi confirmada e não reserva vaga.';

  choose.addEventListener('click', () => {
    resultTitle.textContent = 'Rascunho simulado';
    resultCopy.textContent = 'Domingo, 25/10. Esta solicitação não foi confirmada e não reservou vaga. Na versão real, combine a nova data com a cliente antes de confirmar.';
    status.textContent = 'Data alternativa escolhida. O pedido continua como solicitação para revisar.';
    resultTitle.focus();
  });

  reset.addEventListener('click', () => {
    resultTitle.textContent = initialTitle;
    resultCopy.textContent = initialCopy;
    status.textContent = 'Exemplo reiniciado. A solicitação continua para revisar.';
    choose.focus();
  });
})();
