window.SmartSegmentAPI = window.SmartSegmentAPI || (() => {
  const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";
  const REQUEST_TIMEOUT_MS = 8000;
  const makeUrl = (url) => /^https?:\/\//i.test(url) ? url : `${API_BASE}${url}`;

  async function request(url, options = {}) {
    const headers = {"Accept":"application/json", ...(options.body ? {"Content-Type":"application/json"} : {}), ...(options.headers || {})};
    try {
      const s = JSON.parse(localStorage.getItem("smartSegmentSession") || "null");
      if (s?.token) headers.Authorization = `Bearer ${s.token}`;
    } catch {}

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(makeUrl(url), {...options, headers, signal: controller.signal});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`);
      return data;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("The server or database is taking too long to respond. Please check that MySQL and the backend are running.");
      }
      if (error instanceof TypeError) {
        throw new Error("Cannot connect to the backend. Start the server with: npm start");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    request,
    async get(url) { return request(url); },
    async post(url, body) { return request(url, {method:"POST", body:JSON.stringify(body)}); },
    async put(url, body) { return request(url, {method:"PUT", body:JSON.stringify(body)}); },
    async patch(url, body) { return request(url, {method:"PATCH", body:JSON.stringify(body)}); },
    async delete(url) { return request(url, {method:"DELETE"}); },
    setSession(data) { localStorage.setItem("smartSegmentSession", JSON.stringify(data)); },
    clearSession() { localStorage.removeItem("smartSegmentSession"); }
  };
})();
