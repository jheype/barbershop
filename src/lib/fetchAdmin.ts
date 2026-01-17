function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}=([^;]*)`
    )
  );
  return m ? decodeURIComponent(m[1]) : null;
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function refreshCsrf() {
  try {
    await fetch("/api/admin/csrf", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    // ignore
  }
}

export async function fetchAdminJSON<T = unknown>(
  input: string,
  init: RequestInit = {}
): Promise<T> {
  const method = (init.method || "GET").toUpperCase();

  if (MUTATING.has(method) && !getCookie("admin_csrf")) {
    await refreshCsrf();
  }

  async function runOnce() {
    const csrf = getCookie("admin_csrf");

    return fetch(input, {
      credentials: "include",
      cache: "no-store",
      ...init,
      headers: {
        Accept: "application/json",
        ...(csrf ? { "x-admin-csrf": csrf } : {}),
        ...(init.headers || {}),
      },
    });
  }

  let res = await runOnce();

  const ct = res.headers.get("content-type") || "";
  const isJSON = ct.includes("application/json");

  if (res.status === 403 && isJSON) {
    const j = await res.json().catch(() => ({}));
    if (j?.error === "CSRF") {
      await refreshCsrf();
      res = await runOnce();
    } else {
      throw new Error(j?.error || j?.message || `Failed (${res.status}).`);
    }
  }

  const ct2 = res.headers.get("content-type") || "";
  const isJSON2 = ct2.includes("application/json");

  if (!res.ok) {
    if (!isJSON2) {
      const from = typeof window !== "undefined" ? window.location.pathname : "/";
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== "undefined") window.location.href = `/admin/login?from=${from}`;
      }
      throw new Error(`Failed (${res.status}).`);
    }

    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || j?.message || `Failed (${res.status}).`);
  }

  if (!isJSON2) throw new Error("Resposta não é JSON (possível redirecionamento).");

  return res.json() as Promise<T>;
}
