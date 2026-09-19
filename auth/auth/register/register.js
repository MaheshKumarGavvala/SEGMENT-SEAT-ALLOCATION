document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const name = document.getElementById("name");
  const email = document.getElementById("email");
  const pass = document.getElementById("password");
  const msg = document.getElementById("message");
  const btn = document.getElementById("submit");
  const meter = document.getElementById("meter");
  const strength = document.getElementById("strength");
  const nameError = document.getElementById("nameError");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");

  const setError = (input, node, text) => {
    node.textContent = text;
    input.setAttribute("aria-invalid", text ? "true" : "false");
  };

  const updateStrength = () => {
    const value = pass.value;
    let level = 0;
    if (value.length >= 6) level = 1;
    if (value.length >= 9 && /[A-Z]/.test(value)) level = 2;
    if (value.length >= 10 && /[0-9]/.test(value)) level = 3;
    if (value.length >= 12 && /[^A-Za-z0-9]/.test(value)) level = 4;
    meter.dataset.level = level;
    strength.textContent = ["Use at least 6 characters.", "Fair password", "Good password", "Strong password", "Excellent password"][level];
  };
  pass.addEventListener("input", () => {
    updateStrength();
    setError(pass, passwordError, "");
  });

  document.getElementById("passwordToggle").addEventListener("click", (event) => {
    const isPassword = pass.type === "password";
    pass.type = isPassword ? "text" : "password";
    event.currentTarget.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
  });
  [name,email].forEach((input) => input.addEventListener("input", () => {
    if (input === name) setError(name, nameError, "");
    else setError(email, emailError, "");
    msg.textContent = "";
  }));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    msg.textContent = "";
    setError(name,nameError,""); setError(email,emailError,""); setError(pass,passwordError,"");

    if (name.value.trim().length < 2) { setError(name,nameError,"Please enter your full name."); name.focus(); return; }
    if (!email.value.trim() || !email.validity.valid) { setError(email,emailError,"Please enter a valid email address."); email.focus(); return; }
    if (pass.value.length < 6) { setError(pass,passwordError,"Password must contain at least 6 characters."); pass.focus(); return; }

    btn.disabled = true;
    btn.querySelector("span").textContent = "Creating account…";
    try {
      const response = await SmartSegmentAPI.post("/api/auth/register", {
        name:name.value.trim(), email:email.value.trim(), password:pass.value
      });
      SmartSegmentAPI.setSession(response.data || response);
      window.location.assign("/user/dashboard/index.html");
    } catch (error) {
      msg.textContent = error.message || "Unable to create the account. Please try again.";
      btn.disabled = false;
      btn.querySelector("span").textContent = "Create passenger account";
    }
  });
});