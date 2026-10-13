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
  };

  const showError = (error, fallback) => {
    const message = error && typeof error.message === "string" && error.message.trim()
      ? error.message.trim()
      : fallback;
    $("error-message").textContent = message;
    $("error-message").hidden = false;
    $("status-message").hidden = true;
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
      button.disabled = busy || !available;
    });
    $("google-button").disabled = busy || !capabilities.configured || !capabilities.google;
    $("google-button").hidden = !capabilities.configured || !capabilities.google || !["signup", "login"].includes(mode);
    $("provider-divider").hidden = $("google-button").hidden;
    $("service-notice").hidden = capabilities.configured && capabilities.email;
    if (mode === 'recovery' && capabilities.recoveryEmail === false) {
      $("recovery-form").hidden = true;
      $("recovery-support").hidden = false;
      $("form-title").textContent = "Recuperar acesso";
      $("form-intro").textContent = "A recuperação é feita manualmente com a ajuda de quem te convidou.";
    } else {
      $("recovery-support").hidden = true;
    }
    if (capabilities.configured && !capabilities.email) {
      $("service-notice").textContent = capabilities.google
        ? "O acesso por e-mail está sendo preparado. Você pode continuar com Google."
        : "O acesso por e-mail está sendo preparado. Você pode conhecer a demonstração enquanto isso.";
      $("service-notice").hidden = false;
    }
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

    const headings = {
      signup: ["UM COMEÇO SIMPLES", "Crie sua conta", "Use seu e-mail para começar a organizar sua confeitaria."],
      login: ["BEM-VINDA DE VOLTA", "Entre na sua conta", "Acesse os pedidos e a agenda da sua confeitaria."],
      recovery: ["RECUPERE O ACESSO", "Recuperar acesso", "Informe seu e-mail para receber as instruções de recuperação."],
      update: ["QUASE LÁ", "Escolha uma nova senha", "Crie uma senha nova para voltar à sua conta."],
    }[mode];
    $("mode-eyebrow").textContent = headings[0];
    $("form-title").textContent = headings[1];
    $("form-intro").textContent = headings[2];
    $("terms-note").textContent = mode === "login"
      ? "Ao entrar, você acessa os pedidos e a agenda da sua confeitaria."
      : "Ao criar uma conta, você poderá acessar sua agenda em outros dispositivos.";
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

  const bindPasswordToggles = () => {
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = $(button.dataset.passwordToggle);
        const reveal = input.type === "password";
        input.type = reveal ? "text" : "password";
        button.textContent = reveal ? "Ocultar" : "Mostrar";
        button.setAttribute("aria-pressed", String(reveal));
        button.setAttribute("aria-label", `${reveal ? "Ocultar" : "Mostrar"} ${input.id.includes("confirm") ? "confirmação da senha" : "senha"}`);
        input.focus();
      });
    });
  };

  const bindForms = () => {
    forms.signup.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearNotices();
      const form = forms.signup;
      const password = $("signup-password").value;
      const confirmation = $("signup-password-confirm").value;
      if (!form.reportValidity()) return;
      if (password !== confirmation) {
        $("signup-password-confirm").setCustomValidity("As senhas não coincidem.");
        $("signup-password-confirm").reportValidity();
        $("signup-password-confirm").addEventListener("input", () => $("signup-password-confirm").setCustomValidity(""), { once: true });
        return;
      }
      if (!auth()?.signUp) return showError(null, "Não foi possível iniciar o cadastro agora. Tente novamente.");
      isBusy(true);
      try {
        const result = await auth().signUp({ email: $("signup-email").value.trim(), password, businessName: $("signup-business-name").value.trim() });
        if (result?.error) throw result.error;
        if (await redirectIfSession(result)) return;
        setNotice("Confira seu e-mail para confirmar o cadastro. Depois, volte para entrar na sua conta.", "pending");
      } catch (error) {
        showError(error, "Não foi possível criar a conta. Confira os dados e tente novamente.");
      } finally { isBusy(false); }
    });

    forms.login.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearNotices();
      if (!forms.login.reportValidity()) return;
      if (!auth()?.signIn) return showError(null, "Não foi possível iniciar a sessão agora. Tente novamente.");
      isBusy(true);
      try {
        const result = await auth().signIn({ email: $("login-email").value.trim(), password: $("login-password").value });
        if (result?.error) throw result.error;
        if (!(await redirectIfSession(result))) setNotice("Não foi possível confirmar sua sessão. Tente entrar novamente.");
      } catch (error) {
        showError(error, "Não foi possível entrar. Confira seu e-mail e senha e tente novamente.");
      } finally { isBusy(false); }
    });

    forms.recovery.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearNotices();
      if (!forms.recovery.reportValidity()) return;
      if (!auth()?.sendPasswordReset) return showError(null, "Não foi possível enviar as instruções agora. Tente novamente.");
      isBusy(true);
      try {
        const result = await auth().sendPasswordReset($("recovery-email").value.trim());
        if (result?.error) throw result.error;
        setNotice("Se houver uma conta com esse e-mail, você receberá as instruções para redefinir sua senha.");
      } catch (error) {
        showError(error, "Não foi possível enviar as instruções agora. Tente novamente.");
      } finally { isBusy(false); }
    });

    forms.update.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearNotices();
      if (!forms.update.reportValidity()) return;
      const password = $("update-password").value;
      if (password !== $("update-password-confirm").value) {
        $("update-password-confirm").setCustomValidity("As senhas não coincidem.");
        $("update-password-confirm").reportValidity();
        $("update-password-confirm").addEventListener("input", () => $("update-password-confirm").setCustomValidity(""), { once: true });
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
        showError(error, "Não foi possível atualizar a senha. Tente novamente.");
      } finally { isBusy(false); }
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
        showError(error, "Não foi possível continuar com Google. Tente novamente.");
      } finally { isBusy(false); }
    });
  };

  const start = async () => {
    bindPasswordToggles();
    bindForms();
    setMode(mode);
    const controller = auth();
    if (!controller?.getCapabilities) {
      updateAvailability();
      return;
    }
    try {
      capabilities = { ...capabilities, ...(await controller.getCapabilities()) };
      updateAvailability();
      if (controller.onAuthStateChange) {
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
      const result = await controller.getSession?.();
      if (result?.error) throw result.error;
      if (hasSession(result)) window.location.assign("/app/");
    } catch (error) {
      showError(error, "Não foi possível verificar o acesso agora. Tente novamente.");
    }
  };

  start();
})();
