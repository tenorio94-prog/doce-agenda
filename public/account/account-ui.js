(() => {
  const $ = (id) => document.getElementById(id);
  const auth = () => window.DoceAuth;
  const forms = {
    signup: $("signup-form"),
    login: $("login-form"),
    recovery: $("recovery-form"),
    update: $("update-form"),
  };
  const params = new URLSearchParams(window.location.search);
  let mode = ["login", "recovery", "update"].includes(params.get("mode")) ? params.get("mode") : "signup";
  let capabilities = { configured: false, email: false, google: false };
  let busy = false;
  let checking = true;
  let checkFailed = false;
  let pendingRetry = null;
  let authListening = false;

  const setNotice = (message, kind = "success") => {
    const node = $("status-message");
    node.textContent = message;
    node.className = `notice${kind === "pending" ? " notice-pending" : ""}`;
    node.hidden = false;
    $("error-message").hidden = true;
  };

  const clearNotices = () => {
    $("status-message").hidden = true;
    $("error-message").hidden = true;
    $("retry-button").hidden = true;
    pendingRetry = null;
  };

  // Closed list of known cases; anything else gets the caller's Portuguese fallback.
  // The raw library message never reaches the screen (it goes to the console for support).
  const friendlyError = (error, fallback) => {
    const raw = String(error?.message || "");
    const code = String(error?.code || error?.error_code || "");
    const status = Number(error?.status) || 0;
    const is = (pattern) => pattern.test(raw) || pattern.test(code);
    if (error?.name === "AuthRetryableFetchError" || is(/failed to fetch|networkerror|network request failed|load failed|fetch failed/i)) {
      return { network: true, message: "Não conseguimos falar com o servidor. Confira a internet ou desative o bloqueador de anúncios e tente de novo." };
    }
    if (is(/invalid login credentials|invalid_credentials/i)) return { message: "E-mail ou senha não conferem." };
    if (is(/already (registered|exists)|user_already_exists|email_exists/i)) return { message: "Já existe uma conta com esse e-mail. Use a aba Entrar." };
    if (is(/email not confirmed|email_not_confirmed/i)) return { message: "Confirme seu e-mail antes de entrar. Procure a mensagem de confirmação na sua caixa de entrada." };
    if (is(/different from the old password|same_password/i)) return { message: "A nova senha precisa ser diferente da senha anterior." };
    if (is(/password should be at least|weak_password|weak and easy to guess/i)) return { message: "Escolha uma senha mais forte, com pelo menos 8 caracteres." };
    if (status === 429 || is(/rate limit|rate_limit|only request this after|too many requests/i)) return { message: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo." };
    if (is(/signups? (are |is )?(not allowed|disabled)|signup_disabled|email_provider_disabled/i)) return { message: "O cadastro por e-mail não está disponível agora. Você pode conhecer a demonstração enquanto isso." };
    if (is(/provider is not enabled|unsupported provider|provider_disabled/i)) return { message: "O acesso com Google não está disponível agora." };
    if (is(/unable to validate email|email_address_invalid/i)) return { message: "Confira o e-mail digitado." };
    if (is(/auth session missing|session_not_found|otp_expired|token has expired|bad_jwt|invalid jwt/i)) return { message: "O link expirou. Peça um novo em Esqueci minha senha." };
    if (is(/sendo preparado/i)) return { message: "O cadastro ainda está sendo preparado. Você pode conhecer a demonstração enquanto isso." };
    return { message: fallback };
  };

  // `retry` is offered for network failures, or always when `alwaysRetry` is set (availability check).
  const showError = (error, fallback, retry, alwaysRetry = false) => {
    const { message, network } = friendlyError(error, fallback);
    if (error) console.warn("[Doce Agenda] Erro de acesso (detalhe técnico para suporte):", error?.message ?? error, { name: error?.name, code: error?.code, status: error?.status });
    $("error-message").textContent = message;
    $("error-message").hidden = false;
    $("status-message").hidden = true;
    $("service-notice").hidden = true;
    pendingRetry = retry && (network || alwaysRetry) ? retry : null;
    $("retry-button").hidden = !pendingRetry;
  };

  const isBusy = (value) => {
    busy = value;
    document.querySelectorAll(".account-form button[type=submit], #google-button").forEach((button) => {
      button.disabled = value || !canUseEmail();
      if (value) button.setAttribute("aria-busy", "true");
      else button.removeAttribute("aria-busy");
    });
    // The recovery and password update actions depend on an active configured provider too.
    if (!value) updateAvailability();
  };

  const canUseEmail = () => capabilities.configured && capabilities.email;

  const updateAvailability = () => {
    const available = canUseEmail();
    document.querySelectorAll(".account-form button[type=submit]").forEach((button) => {
      button.disabled = checking || busy || !available;
      if (checking) {
        button.dataset.label ||= button.textContent;
        button.textContent = "Verificando…";
        button.setAttribute("aria-busy", "true");
      } else {
        if (button.dataset.label) button.textContent = button.dataset.label;
        delete button.dataset.label;
        if (!busy) button.removeAttribute("aria-busy");
      }
    });
    $("google-button").disabled = busy || !capabilities.configured || !capabilities.google;
    $("google-button").hidden = !capabilities.configured || !capabilities.google || !["signup", "login"].includes(mode);
    $("provider-divider").hidden = $("google-button").hidden;
    if (mode === 'recovery' && capabilities.recoveryEmail === false) {
      $("recovery-form").hidden = true;
      $("recovery-support").hidden = false;
      $("form-title").textContent = "Recuperar acesso";
      $("form-intro").textContent = "Por enquanto, a recuperação é feita pelo nosso e-mail de contato.";
    } else {
      $("recovery-support").hidden = true;
    }
    if (capabilities.configured && !capabilities.email) {
      $("service-notice-text").textContent = capabilities.google
        ? "O acesso por e-mail está sendo preparado. Você pode continuar com Google."
        : "O acesso por e-mail está sendo preparado. Você pode conhecer a demonstração enquanto isso.";
    }
    // The amber notice only appears once the check answered "not configured"; never next to an error.
    $("service-notice").hidden = checking || checkFailed || canUseEmail() || !$("error-message").hidden;
  };

  const setMode = (nextMode) => {
    mode = nextMode;
    Object.entries(forms).forEach(([name, form]) => { form.hidden = name !== mode; });
    const isLogin = mode === "login" || mode === "recovery";
    $("tab-signup").setAttribute("aria-current", isLogin ? "false" : mode === "signup" ? "page" : "false");
    $("tab-login").setAttribute("aria-current", isLogin ? "page" : "false");
    $("tab-signup").removeAttribute("aria-current");
    $("tab-login").removeAttribute("aria-current");
    if (mode === "signup") $("tab-signup").setAttribute("aria-current", "page");
    if (isLogin) $("tab-login").setAttribute("aria-current", "page");

    // Sem rótulo em maiúsculas acima do título: o título já diz o que é (skill impeccable, 03/11/2026).
    const headings = {
      signup: ["Crie sua conta", "Use seu e-mail para começar a organizar sua confeitaria."],
      login: ["Entre na sua conta", "Acesse os pedidos e a agenda da sua confeitaria."],
      recovery: ["Recuperar acesso", "Informe seu e-mail para receber as instruções de recuperação."],
      update: ["Escolha uma nova senha", "Crie uma senha nova para voltar à sua conta."],
    }[mode];
    $("form-title").textContent = headings[0];
    $("form-intro").textContent = headings[1];
    // Texto fixo nosso (sem dado da pessoa): o link para a política vai junto.
    $("terms-note").innerHTML = `${mode === "login"
      ? "Ao entrar, você acessa os pedidos e a agenda da sua confeitaria."
      : "Ao criar uma conta, você poderá acessar sua agenda em outros dispositivos."} <a href="/privacidade/#conta">Como cuidamos dos seus dados</a>.`;
    $("terms-note").hidden = mode === "recovery" || mode === "update";
    $("recovery-support").hidden = true;
    clearNotices();
    updateAvailability();
  };

  const hasSession = (result) => Boolean(result?.data?.session || result?.session);

  const redirectIfSession = async (result) => {
    let sessionPresent = hasSession(result);
    if (!sessionPresent && auth()?.getSession) {
      const sessionResult = await auth().getSession();
      if (sessionResult?.error) throw sessionResult.error;
      sessionPresent = hasSession(sessionResult);
    }
    if (sessionPresent) {
      window.location.assign("/app/");
      return true;
    }
    return false;
  };

  const revealPassword = (input, reveal) => {
    const button = document.querySelector(`[data-password-toggle="${input.id}"]`);
    input.type = reveal ? "text" : "password";
    if (!button) return;
    button.textContent = reveal ? "Ocultar" : "Mostrar";
    button.setAttribute("aria-pressed", String(reveal));
    button.setAttribute("aria-label", `${reveal ? "Ocultar" : "Mostrar"} ${input.id.includes("confirm") ? "confirmação da senha" : "senha"}`);
  };

  const bindPasswordToggles = () => {
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = $(button.dataset.passwordToggle);
        revealPassword(input, input.type === "password");
        input.focus();
      });
    });
  };

  // Erros junto do campo, em português e ligados a ele (antes: balão do navegador, às vezes em inglês, que some sozinho).
  // Com a recuperação manual, um e-mail errado no cadastro prende a pessoa fora: por isso o formato e os erros comuns.
  const EMAIL_TYPOS = { "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmail.co": "gmail.com", "gamil.com": "gmail.com", "gmil.com": "gmail.com",
    "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com", "outlok.com": "outlook.com", "yahoo.com.b": "yahoo.com.br" };
  const fieldMessage = (input) => {
    const value = input.value.trim();
    if (input.required && !value) return input.type === "email" ? "Escreva seu e-mail." : input.name === "businessName" ? "Escreva o nome da confeitaria."
      : input.name === "passwordConfirm" ? "Repita a nova senha." : "Escreva a senha.";
    if (input.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value)) return "Confira o e-mail: ele precisa ter @ e o final, como @gmail.com.";
    if (input.minLength > 0 && value && input.value.length < input.minLength) return `A senha precisa de pelo menos ${input.minLength} caracteres.`;
    return "";
  };
  const clearFieldError = (input) => {
    $(`${input.id}-error`)?.remove();
    input.removeAttribute("aria-invalid");
    const described = (input.getAttribute("aria-describedby") || "").split(" ").filter((id) => id && id !== `${input.id}-error`).join(" ");
    if (described) input.setAttribute("aria-describedby", described); else input.removeAttribute("aria-describedby");
  };
  const setFieldError = (input, message) => {
    clearFieldError(input);
    const box = document.createElement("small");
    box.className = "field-error";
    box.id = `${input.id}-error`;
    box.textContent = message;
    (input.closest(".password-control") || input).after(box);
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", `${input.getAttribute("aria-describedby") || ""} ${box.id}`.trim());
  };
  const validate = (form) => {
    let first = null;
    form.querySelectorAll("input[required]").forEach((input) => {
      const message = fieldMessage(input);
      if (message) { setFieldError(input, message); first ||= input; } else clearFieldError(input);
    });
    first?.focus();
    return !first;
  };
  const emailTypo = (email) => {
    const [user, domain = ""] = email.toLowerCase().split("@");
    return EMAIL_TYPOS[domain] ? `${user}@${EMAIL_TYPOS[domain]}` : "";
  };
  document.addEventListener("input", (event) => {
    if (event.target.matches?.(".account-form input[aria-invalid]")) clearFieldError(event.target);
  });
  $("copy-support")?.addEventListener("click", async () => {
    let copied = false;
    try { await navigator.clipboard.writeText("doceagenda@lucast.app"); copied = true; } catch { /* sem permissão: o endereço está escrito acima */ }
    $("copy-support-note").textContent = copied ? "Endereço copiado." : "Não deu para copiar: o endereço é doceagenda@lucast.app.";
  });

  const bindForms = () => {
    forms.signup.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearNotices();
      const form = forms.signup;
      const password = $("signup-password").value;
      if (!validate(form)) return;
      // "gmial.com" e parecidos: pergunta uma vez; se ela enviar de novo com o mesmo e-mail, segue.
      const email = $("signup-email").value.trim(), suggestion = emailTypo(email);
      if (suggestion && form.dataset.typoChecked !== email) {
        form.dataset.typoChecked = email;
        setFieldError($("signup-email"), `Confira: não seria ${suggestion}? Se estiver certo, toque em Criar conta de novo.`);
        $("signup-email").focus();
        return;
      }
      // Sem campo de confirmação: a senha aparece por padrão para ser conferida, e volta a ser
      // campo de senha no envio para o navegador oferecer guardá-la.
      revealPassword($("signup-password"), false);
      if (!auth()?.signUp) return showError(null, "Não foi possível iniciar o cadastro agora. Tente novamente.");
      isBusy(true);
      try {
        const result = await auth().signUp({ email: $("signup-email").value.trim(), password, businessName: $("signup-business-name").value.trim() });
        if (result?.error) throw result.error;
        if (await redirectIfSession(result)) return;
        setNotice("Confira seu e-mail para confirmar o cadastro. Depois, volte para entrar na sua conta.", "pending");
      } catch (error) {
        showError(error, "Não foi possível criar a conta. Confira os dados e tente novamente.", () => forms.signup.requestSubmit());
      } finally { isBusy(false); }
    });

    forms.login.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearNotices();
      if (!validate(forms.login)) return;
      if (!auth()?.signIn) return showError(null, "Não foi possível iniciar a sessão agora. Tente novamente.");
      isBusy(true);
      try {
        const result = await auth().signIn({ email: $("login-email").value.trim(), password: $("login-password").value });
        if (result?.error) throw result.error;
        if (!(await redirectIfSession(result))) setNotice("Não foi possível confirmar sua sessão. Tente entrar novamente.");
      } catch (error) {
        showError(error, "Não foi possível entrar. Confira seu e-mail e senha e tente novamente.", () => forms.login.requestSubmit());
      } finally { isBusy(false); }
    });

    forms.recovery.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearNotices();
      if (!validate(forms.recovery)) return;
      if (!auth()?.sendPasswordReset) return showError(null, "Não foi possível enviar as instruções agora. Tente novamente.");
      isBusy(true);
      try {
        const result = await auth().sendPasswordReset($("recovery-email").value.trim());
        if (result?.error) throw result.error;
        setNotice("Se houver uma conta com esse e-mail, você receberá as instruções para redefinir sua senha.");
      } catch (error) {
        showError(error, "Não foi possível enviar as instruções agora. Tente novamente.", () => forms.recovery.requestSubmit());
      } finally { isBusy(false); }
    });

    forms.update.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearNotices();
      if (!validate(forms.update)) return;
      const password = $("update-password").value;
      if (password !== $("update-password-confirm").value) {
        setFieldError($("update-password-confirm"), "As duas senhas precisam ser iguais.");
        $("update-password-confirm").focus();
        return;
      }
      if (!auth()?.updatePassword) return showError(null, "Não foi possível atualizar a senha agora. Tente novamente.");
      isBusy(true);
      try {
        const result = await auth().updatePassword(password);
        if (result?.error) throw result.error;
        setMode("login");
        setNotice("Senha atualizada. Você já pode entrar com a nova senha.");
        window.history.replaceState({}, "", "/cadastro/?mode=login");
      } catch (error) {
        showError(error, "Não foi possível atualizar a senha. Tente novamente.", () => forms.update.requestSubmit());
      } finally { isBusy(false); }
    });

    $("retry-button").addEventListener("click", () => {
      const retry = pendingRetry;
      clearNotices();
      if (retry) retry();
    });

    $("google-button").addEventListener("click", async () => {
      clearNotices();
      if (!auth()?.signInWithGoogle) return showError(null, "O acesso com Google não está disponível agora.");
      isBusy(true);
      try {
        const result = await auth().signInWithGoogle();
        if (result?.error) throw result.error;
        // OAuth implementations usually navigate away; redirect when the provider returns a session directly.
        await redirectIfSession(result);
      } catch (error) {
        showError(error, "Não foi possível continuar com Google. Tente novamente.", () => $("google-button").click());
      } finally { isBusy(false); }
    });
  };

  const checkAccess = async () => {
    const controller = auth();
    if (!controller?.getCapabilities) {
      checking = false;
      updateAvailability();
      return;
    }
    checking = true;
    checkFailed = false;
    updateAvailability();
    try {
      capabilities = { ...capabilities, ...(await controller.getCapabilities()) };
      checking = false;
      updateAvailability();
      if (controller.onAuthStateChange && !authListening) {
        authListening = true;
        controller.onAuthStateChange((eventOrPayload, sessionArg) => {
          const event = typeof eventOrPayload === "string" ? eventOrPayload : eventOrPayload?.event;
          const session = sessionArg || eventOrPayload?.session;
          if (event === "PASSWORD_RECOVERY") setMode("update");
          else if (event === "SIGNED_IN" && session && mode !== "update") window.location.assign("/app/");
        });
      }
      if (mode === "update" || mode === "recovery") {
        if (window.location.hash.includes("type=recovery")) setMode("update");
        return;
      }
      // Without a configured provider there is no session to look for; the amber notice already explains it.
      if (!capabilities.configured) return;
      const result = await controller.getSession?.();
      if (result?.error) throw result.error;
      if (hasSession(result)) window.location.assign("/app/");
    } catch (error) {
      // checkFailed only when the availability answer itself never arrived.
      checkFailed = checking;
      checking = false;
      updateAvailability();
      showError(error, "Não foi possível verificar o acesso agora. Tente novamente.", checkAccess, true);
    }
  };

  const start = () => {
    bindPasswordToggles();
    bindForms();
    setMode(mode);
    return checkAccess();
  };

  start();
})();
