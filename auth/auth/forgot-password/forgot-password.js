document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetForm");
  const email = document.getElementById("email");
  const pass = document.getElementById("newPassword");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const err = document.getElementById("error");
  const success = document.getElementById("success");
  const btn = document.getElementById("resetBtn");

  const setError = (input, node, text) => {
    node.textContent = text;
    input.setAttribute("aria-invalid", text ? "true" : "false");
  };

  document.getElementById("passwordToggle").addEventListener("click", (event) => {
    const isPassword = pass.type === "password";
    pass.type = isPassword ? "text" : "password";
    event.currentTarget.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
  });
  email.addEventListener("input", () => setError(email,emailError,""));
  pass.addEventListener("input", () => setError(pass,passwordError,""));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    err.textContent = "";
    success.hidden = true;
    setError(email,emailError,""); setError(pass,passwordError,"");

    if (!email.value.trim() || !email.validity.valid) {
      setError(email,emailError,"Please enter a valid email address."); email.focus(); return;
    }
    if (pass.value.length < 6) {
      setError(pass,passwordError,"New password must contain at least 6 characters."); pass.focus(); return;
    }

    btn.disabled = true;
    btn.querySelector("span").textContent = "Updating…";
    try {
      await SmartSegmentAPI.post("/api/auth/reset-password",{email:email.value.trim(),password:pass.value});
      success.hidden = false;
      form.reset();
      setError(email,emailError,""); setError(pass,passwordError,"");
    } catch (error) {
      err.textContent = error.message || "Unable to update your password. Please try again.";
    } finally {
      btn.disabled = false;
      btn.querySelector("span").textContent = "Update password";
    }
  });
});