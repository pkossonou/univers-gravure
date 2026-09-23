import { SITE } from "./site";

/** Erreur API normalisée : { message, errors? } renvoyé par Laravel. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }

  /** Premier message d'erreur d'un champ (formulaires). */
  field(name: string): string | undefined {
    return this.errors[name]?.[0];
  }
}

const TOKEN_KEY = "ug_token";

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (token) window.localStorage.setItem(TOKEN_KEY, token);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* stockage indisponible (navigation privée) : session en mémoire seulement */
    }
  },
};

type Query = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

export function buildQuery(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Query;
}

/** Client HTTP navigateur (jeton Bearer Sanctum). */
export async function api<T = unknown>(path: string, { body, query, headers, ...init }: RequestOptions = {}): Promise<T> {
  const token = tokenStore.get();
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(`${SITE.apiUrl}${path}${buildQuery(query)}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(isForm || body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });

  if (response.status === 401 && token) {
    tokenStore.set(null);
    if (typeof window !== "undefined") window.dispatchEvent(new Event("ug:unauthorized"));
  }

  if (!response.ok) {
    let payload: { message?: string; errors?: Record<string, string[]> } = {};
    try {
      payload = await response.json();
    } catch {
      /* réponse non JSON */
    }
    throw new ApiError(
      response.status,
      payload.message ?? (response.status >= 500 ? "Le service est momentanément indisponible." : "La requête a échoué."),
      payload.errors,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/** Téléchargement authentifié (PDF, CSV) déclenché côté navigateur. */
export async function download(path: string, query?: Query, fallbackName = "document") {
  const token = tokenStore.get();
  const response = await fetch(`${SITE.apiUrl}${path}${buildQuery(query)}`, {
    headers: { Accept: "*/*", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw new ApiError(response.status, "Téléchargement impossible.");
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: decodeURIComponent(name) });
  a.click();
  URL.revokeObjectURL(url);
}

/** Envoi de fichier avec progression (XHR : fetch n'expose pas l'upload progress). */
export function uploadWithProgress<T>(path: string, form: FormData, onProgress: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SITE.apiUrl}${path}`);
    xhr.setRequestHeader("Accept", "application/json");
    const token = tokenStore.get();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let payload: { message?: string; errors?: Record<string, string[]> } & T = {} as never;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
      else reject(new ApiError(xhr.status, payload.errors?.file?.[0] ?? payload.message ?? "Envoi impossible.", payload.errors));
    };
    xhr.onerror = () => reject(new ApiError(0, "Connexion interrompue pendant l'envoi."));
    xhr.send(form);
  });
}
