// ─── Client-side fetch wrapper ───────────────────────────────────────
// All API calls should use this instead of raw fetch().
// Automatically attaches the current user's ID from localStorage.

interface SessionData {
  isLoggedIn: boolean
  name?: string
  email?: string
  id?: string
  role?: string
}

function getSession(): SessionData {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem('wc_dashboard_session')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/**
 * Enhanced fetch that automatically includes X-User-Id header
 * from the current session. Use this for all authenticated API calls.
 */
export function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const session = getSession()
  const headers = new Headers(options?.headers || {})

  if (session.id) {
    headers.set('X-User-Id', session.id)
  }

  // Set content-type for JSON bodies if not already set
  if (options?.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Shorthand for GET requests
 */
export function apiGet(url: string): Promise<Response> {
  return apiFetch(url, { method: 'GET' })
}

/**
 * Shorthand for POST requests with JSON body
 */
export function apiPost(url: string, body?: unknown): Promise<Response> {
  return apiFetch(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Shorthand for PUT requests with JSON body
 */
export function apiPut(url: string, body?: unknown): Promise<Response> {
  return apiFetch(url, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Shorthand for DELETE requests
 */
export function apiDelete(url: string): Promise<Response> {
  return apiFetch(url, { method: 'DELETE' })
}
