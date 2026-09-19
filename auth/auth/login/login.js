document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const email = document.getElementById("email");
  const pass = document.getElementById("password");
  const btn = document.getElementById("submitBtn");
  const msg = document.getElementById("message");
  const role = document.getElementById("role");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");

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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    msg.textContent = "";
    setError(email, emailError, "");
    setError(pass, passwordError, "");

    if (!email.value.trim() || !email.validity.valid) {
      setError(email, emailError, "Please enter a valid email address.");
      email.focus();
      return;
    }
    if (!pass.value) {
      setError(pass, passwordError, "Please enter your password.");
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
      window.location.assign(role.value === "admin" ? "/SEGMENT-SEAT-ALLOCATION/admin/dashboard/dashboard.html" : "/SEGMENT-SEAT-ALLOCATION/user/dashboard/index.html");
    } catch (error) {
      msg.textContent = error.message || "Unable to sign in. Please try again.";
      btn.disabled = false;
      btn.querySelector(".btn-text").textContent = "Sign in securely";
    }
  });
});