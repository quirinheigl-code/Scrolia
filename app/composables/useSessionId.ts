const SESSION_STORAGE_KEY = 'scrolia_session_id'

// One anonymous id per browser, created on first use and reused after —
// this is what ties a visitor's answers together without any login.
export function useSessionId(): string {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem(SESSION_STORAGE_KEY, id)
  return id
}
