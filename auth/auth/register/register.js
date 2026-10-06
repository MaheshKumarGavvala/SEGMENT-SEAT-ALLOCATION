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
    if (value.length >= 8) level = 1;
    if (value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value)) level = 2;
    if (value.length >= 8 && /[0-9]/.test(value)) level = 3;
    if (value.length >= 10 && /[^A-Za-z0-9]/.test(value)) level = 4;
    meter.dataset.level = level;
    strength.textContent = ["Use 8+ chars, upper, lower & number.", "Fair password", "Good password", "Strong password", "Excellent password"][level];
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

    if (name.value.trim().length < 5 || name.value.trim().length > 20) { setError(name,nameError,"Name must be between 5 and 20 characters."); name.focus(); return; }
    if (!/^[^\\s@]+@gmail\\.com$/i.test(email.value.trim())) { setError(email,emailError,"Please use a Gmail address ending with @gmail.com."); email.focus(); return; }
    if (pass.value.length < 8 || !/[A-Z]/.test(pass.value) || !/[a-z]/.test(pass.value) || !/[0-9]/.test(pass.value)) { setError(pass,passwordError,"Password must be 8+ characters with uppercase, lowercase, and a number."); pass.focus(); return; }

    btn.disabled = true;
    btn.querySelector("span").textContent = "Creating account…";
    try {
      const response = await SmartSegmentAPI.post("/api/auth/register", {
        name:name.value.trim(), email:email.value.trim(), password:pass.value
      });
      SmartSegmentAPI.setSession(response.data || response);
      window.location.assign("../../../user/dashboard/index.html");
    } catch (error) {
      msg.textContent = error.message || "Unable to create the account. Please try again.";
      btn.disabled = false;
      btn.querySelector("span").textContent = "Create passenger account";
    }
  });
});