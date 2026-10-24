export const API_KEY_STORAGE_KEY = 'openweatherweb:openweather-api-key'

export function readSavedApiKey(): string {
  try { return window.localStorage.getItem(API_KEY_STORAGE_KEY)?.trim() || '' }
  catch { return '' }
}

export function saveApiKey(value: string): void {
  const key = value.trim()
  if (!key) throw new Error('Введите API-ключ.')
  try { window.localStorage.setItem(API_KEY_STORAGE_KEY, key) }
  catch { throw new Error('Не удалось сохранить ключ. Разрешите сайту локальное хранилище в настройках браузера и попробуйте ещё раз.') }
}

export function removeSavedApiKey(): void {
  try { window.localStorage.removeItem(API_KEY_STORAGE_KEY) }
  catch { throw new Error('Не удалось удалить сохранённый ключ. Очистите данные этого сайта в настройках браузера.') }
}
