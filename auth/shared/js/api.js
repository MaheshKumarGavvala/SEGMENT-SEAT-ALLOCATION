window.SmartSegmentAPI = window.SmartSegmentAPI || (() => {
  // Use the local backend when the app is served by the project server.
  // A hosted backend can still be supplied explicitly for deployed builds.
  const configuredBase = String(window.SMART_SEGMENT_API_BASE || '').trim().replace(/\/$/, '');
  const hostname = window.location.hostname;
  const isLocalHost = ['localhost','127.0.0.1','0.0.0.0'].includes(hostname);
  const isGitHubPages = hostname.endsWith('.github.io');
  const sameOriginBase = (window.location.protocol === 'http:' || window.location.protocol === 'https:')
    ? window.location.origin
    : '';
  const localBase = isLocalHost ? 'http://localhost:3000' : '';
  const hostedBase = isGitHubPages ? 'https://segment-seat-allocation.onrender.com' : sameOriginBase;
  const API_BASE = configuredBase || localBase || hostedBase || "https://segment-seat-allocation.onrender.com";
  const REQUEST_TIMEOUT_MS = 8000;
  const makeUrl = (url) => /^https?:\/\//i.test(url) ? url : `${API_BASE}${url}`;

  async function request(url, options = {}) {
    const headers = {
      "Accept": "application/json",
      ...(options.body ? {"Content-Type":"application/json"} : {}),
      ...(options.headers || {})
    };

    try {
      const s = JSON.parse(localStorage.getItem("smartSegmentSession") || "null");
      if (s?.token) headers.Authorization = `Bearer ${s.token}`;
    } catch {}

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(makeUrl(url), {
        ...options,
        headers,
        signal: controller.signal
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.message || data.error || `Request failed (${res.status})`
        );
      }

      return data;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error(
          "The server or database is taking too long to respond. Please try again."
        );
      }

      if (error instanceof TypeError) {
        throw new Error(
          "Cannot connect to the Smart Segment backend."
        );
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    request,

    async get(url) {
      return request(url);
    },

    async post(url, body) {
      return request(url, {
        method: "POST",
        body: JSON.stringify(body)
      });
    },

    async put(url, body) {
      return request(url, {
        method: "PUT",
        body: JSON.stringify(body)
      });
    },

    async patch(url, body) {
      return request(url, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
    },

    async delete(url) {
      return request(url, {
        method: "DELETE"
      });
    },

    setSession(data) {
      localStorage.setItem(
        "smartSegmentSession",
        JSON.stringify(data)
      );
    },

    clearSession() {
      localStorage.removeItem("smartSegmentSession");
    }
  };
})();
