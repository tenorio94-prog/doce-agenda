(() => {
  // Access-card structure adapted from Tailark Login Page 2 (MIT); no source JSX is reused.
  const landing = document.getElementById('landing');
  const flow = document.getElementById('flow');
  const screen = new URL(window.location.href).searchParams.get('screen');
  const screenNames = ['signup', 'login', 'recovery', 'verify', 'setup', 'firstorder', 'done'];
  const mark = '<a class="flow-home" href="index.html" aria-label="Voltar à página inicial"><img src="../../public/logo.svg" alt="Doce Agenda" width="145" height="38"></a>';

  const screens = {
    signup: {
      kicker: 'SUA AGENDA COMEÇA AQUI', title: 'Crie sua conta', intro: 'Uma proposta para uma versão futura da Doce Agenda. Conte um pouco sobre você para começar.',
      fields: `<label class="field"><span>Seu nome</span><input name="name" autocomplete="name" required placeholder="Ex.: Marina Costa"></label>
        <label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="email" required placeholder="voce@exemplo.com"></label>
        <label class="field"><span>Senha</span><div class="password-wrap"><input id="signup-password" name="password" type="password" autocomplete="new-password" minlength="8" required placeholder="Pelo menos 8 caracteres"><button class="reveal-password" type="button" aria-controls="signup-password" aria-pressed="false">Mostrar</button></div><small>Use pelo menos 8 caracteres.</small></label>`,
      submit: 'Criar conta', next: 'verify', footer: `Já tem uma conta? <a href="?screen=login">Entrar</a>`,
      loading: 'Preparando a próxima etapa…', success: 'Simulação: seus dados não foram enviados nem salvos. Veja a confirmação fictícia de e-mail.'
    },
    login: {
      kicker: 'BEM-VINDA DE VOLTA', title: 'Entre na sua conta', intro: 'O acesso com conta é uma proposta futura. Esta tela é apenas uma simulação navegável.',
      fields: `<label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="email" required placeholder="voce@exemplo.com"></label>
        <label class="field"><span>Senha</span><div class="password-wrap"><input id="login-password" name="password" type="password" autocomplete="current-password" required placeholder="Sua senha"><button class="reveal-password" type="button" aria-controls="login-password" aria-pressed="false">Mostrar</button></div></label>
        <a class="form-link" href="?screen=recovery">Esqueci minha senha</a>`,
      submit: 'Entrar', next: 'setup', footer: `Ainda não tem uma conta? <a href="?screen=signup">Criar conta</a>`,
      loading: 'Verificando os dados…', success: 'Simulação: o acesso ainda não está disponível no piloto. Você pode seguir para a prévia do onboarding.'
    },
    recovery: {
      kicker: 'RECUPERAR ACESSO', title: 'Vamos ajudar você a entrar', intro: 'Informe o e-mail usado no cadastro. Vamos mostrar uma confirmação fictícia nesta prévia.',
      fields: `<label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="email" required placeholder="voce@exemplo.com"></label>`,
      submit: 'Enviar instruções', next: null, footer: `<a href="?screen=login">Voltar para entrar</a>`,
      loading: 'Preparando a confirmação…', success: 'Se houver uma conta com esse e-mail, você receberá as instruções de recuperação. Esta tela não envia e-mails.'
    },
    verify: {
      kicker: 'CONFIRMAÇÃO DE E-MAIL', title: 'Confira sua caixa de entrada', intro: 'Na versão completa, você confirmaria seu e-mail antes de seguir. Aqui, esta etapa é demonstrativa.',
      fields: `<div class="notice" role="status"><span class="notice-icon" aria-hidden="true">✉</span><span>Mensagem fictícia pronta. Nenhum e-mail foi enviado.</span></div>`,
      submit: 'Continuar', next: 'setup', footer: `<a href="?screen=signup">Voltar ao cadastro</a>`,
      loading: 'Abrindo a próxima etapa…', success: 'Prévia do cadastro concluída.'
    },
    setup: {
      kicker: 'PASSO 1 DE 2', title: 'Vamos organizar sua agenda', intro: 'Dê um nome ao seu espaço. Este dado fica apenas na tela durante a demonstração.',
      fields: `<label class="field"><span>Nome da confeitaria <span class="optional-label">opcional</span></span><input name="business" autocomplete="organization" placeholder="Ex.: Ateliê da Marina"></label><div class="flow-steps" aria-label="Etapa 1 de 2"><span class="active"></span><span></span></div>`,
      submit: 'Cadastrar primeiro pedido', next: 'firstorder', footer: `<a href="?screen=firstorder">Fazer isso depois</a>`,
      loading: 'Preparando sua agenda…', success: 'Prévia da agenda pronta. Nenhum dado foi salvo.'
    },
    firstorder: {
      kicker: 'PASSO 2 DE 2', title: 'Cadastre o primeiro pedido', intro: 'Comece com cliente, produto, valor e situação. A data pode ficar em branco enquanto ainda for um orçamento.',
      fields: `<div class="flow-steps" aria-label="Etapa 2 de 2"><span class="active"></span><span class="active"></span></div>
        <label class="field"><span>Nome da cliente</span><input name="client" autocomplete="name" required placeholder="Ex.: Marina Costa"></label>
        <label class="field"><span>Produto</span><input name="product" required placeholder="Ex.: bolo de aniversário"></label>
        <label class="field"><span>Data e horário <span class="optional-label">opcional</span></span><input name="dueAt" type="datetime-local"></label>
        <label class="field"><span>Valor total (R$)</span><input name="total" type="number" min="0" step="0.01" inputmode="decimal" value="0" required></label>
        <label class="field"><span>Situação</span><select name="status"><option>Orçamento</option><option>Aguardando confirmação</option><option>Confirmado</option><option>Em produção</option><option>Pronto</option><option>Entregue</option><option>Cancelado</option></select></label>
        <label class="field"><span>Detalhes do combinado <span class="optional-label">opcional</span></span><textarea name="details" rows="2" placeholder="Tamanho, sabores, decoração…"></textarea></label>`,
      submit: 'Salvar pedido', next: 'done', footer: `<a href="?screen=setup">Voltar</a>`,
      loading: 'Preparando a prévia…', success: 'Simulação: nenhum dado foi enviado ou salvo.'
    }
  };

  function flowShell(content, footer = '') {
    return `<div class="flow-shell"><div class="flow-brandbar">${mark}<a href="index.html" class="exit-link">Sair</a></div>${content}${footer ? `<div class="flow-bottom">${footer}</div>` : ''}</div>`;
  }

  function renderDone(order, sample = false) {
    flow.innerHTML = flowShell(`<div class="flow-main"><span class="pill-label">AGENDA · PRÉVIA</span><div class="done-mark" aria-hidden="true">✓</div><p class="flow-kicker">PEDIDO NA AGENDA</p><h1>Prévia do pedido na agenda</h1><p class="flow-intro">${sample ? 'Exemplo fictício para mostrar como um pedido pode aparecer.' : 'Esta é apenas uma prévia. Nenhum dado foi enviado ou salvo.'}</p><article class="demo-order"><h2>Pedido</h2><p><strong data-order-client></strong></p><p data-order-product></p><p>Valor total · <strong data-order-total></strong></p><p>Situação · <strong data-order-status></strong></p><p>Pagamento · <strong>Ainda não conferido</strong></p></article><a class="button button-primary full-button" href="index.html">Voltar ao início</a><p class="flow-footnote">Protótipo: cadastro, login e dados de pedido ainda não são persistidos nem enviados.</p></div>`);
    flow.querySelector('[data-order-client]').textContent = order.client;
    flow.querySelector('[data-order-product]').textContent = order.product;
    flow.querySelector('[data-order-total]').textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total);
    flow.querySelector('[data-order-status]').textContent = order.status;
  }

  if (!screen || !screenNames.includes(screen)) return;
  landing.hidden = true;
  flow.hidden = false;
  if (screen === 'done') {
    renderDone({ client: 'Pedido de exemplo', product: 'Bolo de aniversário', total: 0, status: 'Orçamento' }, true);
    return;
  }
  const data = screens[screen];
  if (!data) return;
  const form = `<form class="flow-form" novalidate><div class="form-error" role="alert" hidden></div>${data.fields}<div class="form-actions"><button class="button button-primary full-button" type="submit">${data.submit}</button></div><p class="flow-footnote" aria-live="polite">Prévia de navegação: nada é enviado ou salvo.</p></form>`;
  flow.innerHTML = flowShell(`<div class="flow-main"><p class="flow-kicker">${data.kicker}</p><h1>${data.title}</h1><p class="flow-intro">${data.intro}</p>${data.next === null ? '<div id="recovery-result" class="notice" role="status" tabindex="-1" hidden></div>' : ''}${form}</div>`, data.footer || '');

  flow.querySelectorAll('.reveal-password').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.getAttribute('aria-controls'));
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.textContent = show ? 'Ocultar' : 'Mostrar';
      button.setAttribute('aria-pressed', String(show));
    });
  });

  const activeForm = flow.querySelector('form');
  activeForm.addEventListener('submit', event => {
    event.preventDefault();
    const error = activeForm.querySelector('.form-error');
    const invalid = [...activeForm.querySelectorAll('input,textarea,select')].find(input => !input.checkValidity());
    if (invalid) {
      error.textContent = invalid.validity.valueMissing ? 'Preencha este campo para continuar.' : 'Confira o valor informado e tente novamente.';
      error.hidden = false;
      invalid.focus();
      return;
    }
    error.hidden = true;
    const submit = activeForm.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = data.loading;
    const footnote = activeForm.querySelector('.flow-footnote');
    if (footnote) { footnote.setAttribute('role', 'status'); footnote.textContent = data.loading; }
    window.setTimeout(() => {
      if (data.next === null) {
        const result = document.getElementById('recovery-result');
        result.hidden = false;
        result.innerHTML = `<span class="notice-icon" aria-hidden="true">✓</span><span>${data.success}</span>`;
        submit.disabled = false;
        submit.textContent = 'Enviar novamente';
        if (footnote) footnote.textContent = 'Prévia de navegação: nenhum e-mail foi enviado.';
        result.focus();
      } else if (screen === 'firstorder') {
        const values = new FormData(activeForm);
        renderDone({
          client: values.get('client'),
          product: values.get('product'),
          total: Number(values.get('total')) || 0,
          status: values.get('status')
        });
      } else {
        window.location.href = `?screen=${data.next}`;
      }
    }, 350);
  });
})();
