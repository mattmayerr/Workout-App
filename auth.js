const authForm = document.querySelector("#auth-form");
const authTitle = document.querySelector("#auth-title");
const authDescription = document.querySelector("#auth-description");
const authSubmit = document.querySelector("#auth-submit");
const authToggle = document.querySelector("#auth-toggle");
const authMessage = document.querySelector("#auth-message");
const authPassword = document.querySelector("#auth-password");
const supabaseClient = createSupabaseClient();

let isCreatingAccount = false;

function createSupabaseClient() {
  const config = globalThis.WORKOUT_SUPABASE_CONFIG || {};
  const hasConfig = Boolean(config.url && config.anonKey);
  const hasSdk = Boolean(globalThis.supabase?.createClient);

  if (!hasConfig || !hasSdk) return null;
  return globalThis.supabase.createClient(config.url, config.anonKey);
}

function getTrackerUrl() {
  return new URL("index.html", window.location.href).href;
}

function setMessage(message, type = "info") {
  authMessage.hidden = !message;
  authMessage.textContent = message;
  authMessage.className =
    type === "error" ? "message message--error" : `message message--${type}`;
}

function setMode(nextMode) {
  isCreatingAccount = nextMode === "signup";
  authTitle.textContent = isCreatingAccount ? "Create account" : "Sign in";
  authDescription.textContent = isCreatingAccount
    ? "Create an account so your workout data can sync privately through Supabase."
    : "Use the email and password connected to your workout tracker account.";
  authSubmit.textContent = isCreatingAccount ? "Create account" : "Sign in";
  authToggle.textContent = isCreatingAccount ? "Sign in instead" : "Create an account instead";
  authPassword.autocomplete = isCreatingAccount ? "new-password" : "current-password";
  setMessage("");
}

function setLoading(isLoading) {
  authSubmit.disabled = isLoading;
  authToggle.disabled = isLoading;
  authSubmit.textContent = isLoading
    ? isCreatingAccount
      ? "Creating account..."
      : "Signing in..."
    : isCreatingAccount
      ? "Create account"
      : "Sign in";
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  if (!supabaseClient) {
    setMessage("Add your Supabase URL and anon key to supabase-config.js first.", "error");
    return;
  }

  const formData = new FormData(authForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  setLoading(true);

  try {
    if (isCreatingAccount) {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getTrackerUrl(),
        },
      });

      setLoading(false);

      if (error) {
        setMessage(error.message, "error");
        return;
      }

      if (data.session) {
        window.location.href = getTrackerUrl();
        return;
      }

      setMode("signin");
      setMessage(
        "Account created. If email confirmation is enabled, check your inbox before signing in.",
        "success",
      );
      return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMessage(error.message, "error");
      return;
    }

    window.location.href = getTrackerUrl();
  } catch (error) {
    setLoading(false);
    setMessage(
      `Could not reach Supabase. Check supabase-config.js and your Auth URL settings. ${error.message}`,
      "error",
    );
  }
}

async function initAuthPage() {
  if (!supabaseClient) {
    setMessage("Cloud login is not configured yet. Fill in supabase-config.js first.", "error");
    authSubmit.disabled = true;
    authToggle.disabled = true;
    return;
  }

  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    window.location.href = getTrackerUrl();
  }
}

authToggle.addEventListener("click", () => {
  setMode(isCreatingAccount ? "signin" : "signup");
});

authForm.addEventListener("submit", handleAuthSubmit);

initAuthPage();
