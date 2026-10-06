document.addEventListener("DOMContentLoaded", () => {
  const googleToken = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("google_token");
  if (googleToken) {
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(googleToken))));
      SmartSegmentAPI.setSession(data);
      history.replaceState(null, "", window.location.pathname + window.location.search);
      window.location.assign("../../../user/dashboard/index.html");
      return;
    } catch (error) {
      console.error("Google sign-in response could not be read.", error);
    }
  }
  const form = document.getElementById("loginForm");
  const email = document.getElementById("email");
  const pass = document.getElementById("password");
  const btn = document.getElementById("submitBtn");
  const msg = document.getElementById("message");
  const role = document.getElementById("role");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const googleBtn = document.getElementById("googleBtn");

  const setError = (input, node, text) => {
    node.textContent = text;
    input.setAttribute("aria-invalid", text ? "true" : "false");
  };

  document.querySelectorAll("#roleSwitch button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("#roleSwitch button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      role.value = button.dataset.role;
    });
  });

  document.getElementById("passwordToggle").addEventListener("click", (event) => {
    const isPassword = pass.type === "password";
    pass.type = isPassword ? "text" : "password";
    event.currentTarget.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
    event.currentTarget.querySelector("svg").style.opacity = isPassword ? ".72" : "1";
  });

  email.addEventListener("input", () => setError(email, emailError, ""));
  pass.addEventListener("input", () => setError(pass, passwordError, ""));

  const googleError = new URLSearchParams(window.location.search).get("google_error");
  if (googleError) msg.textContent = googleError;

  googleBtn?.addEventListener("click", () => {
    googleBtn.disabled = true;
    msg.textContent = "Redirecting to Google…";
    const apiBase = window.location.hostname.endsWith(".github.io")
      ? "https://segment-seat-allocation.onrender.com"
      : (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://localhost:3000" : window.location.origin);
    window.location.assign(`${apiBase}/api/auth/google`);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    msg.textContent = "";
    setError(email, emailError, "");
    setError(pass, passwordError, "");

    if (!/^[^\\s@]+@gmail\\.com$/i.test(email.value.trim())) {
      setError(email, emailError, "Please use a Gmail address ending with @gmail.com.");
      email.focus();
      return;
    }
    if (!pass.value) {
      setError(pass, passwordError, "Please enter your password.");
      pass.focus();
      return;
    }
    if (pass.value.length < 8 || !/[A-Z]/.test(pass.value) || !/[a-z]/.test(pass.value) || !/[0-9]/.test(pass.value)) {
      setError(pass, passwordError, "Password must be 8+ characters with uppercase, lowercase, and a number.");
      pass.focus();
      return;
    }

    btn.disabled = true;
    msg.textContent = "Connecting securely…";
    btn.querySelector(".btn-text").textContent = "Signing in…";
    try {
      const response = await SmartSegmentAPI.post("/api/auth/login", {
        email: email.value.trim(),
        password: pass.value,
        role: role.value
      });
      SmartSegmentAPI.setSession(response.data || response);
      window.location.assign(role.value === "admin" ? "../../../admin/dashboard/dashboard.html" : "../../../user/dashboard/index.html");
    } catch (error) {
      msg.textContent = error.message || "Unable to sign in. Please try again.";
      btn.disabled = false;
      btn.querySelector(".btn-text").textContent = "Sign in securely";
    }
  });
});