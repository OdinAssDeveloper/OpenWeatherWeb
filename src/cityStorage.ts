import type { City } from './api'

export const CITIES_STORAGE_KEY = 'openweatherweb:saved-cities'
export const cityId = (city: City) => `${city.lat}:${city.lon}`

function isCity(value: unknown): value is City {
  if (!value || typeof value !== 'object') return false
  const city = value as Partial<City>
  return typeof city.name === 'string' && !!city.name.trim() &&
    typeof city.country === 'string' && typeof city.lat === 'number' &&
    Number.isFinite(city.lat) && Math.abs(city.lat) <= 90 &&
    typeof city.lon === 'number' && Number.isFinite(city.lon) && Math.abs(city.lon) <= 180 &&
    (city.state === undefined || typeof city.state === 'string') &&
    (city.local_names === undefined || (city.local_names !== null && typeof city.local_names === 'object' &&
      Object.values(city.local_names).every(name => typeof name === 'string')))
}

export function readSavedCities(): City[] {
  try {
    const data: unknown = JSON.parse(window.localStorage.getItem(CITIES_STORAGE_KEY) || '[]')
    if (!Array.isArray(data)) return []
    const unique = new Map<string, City>()
    for (const city of data) if (isCity(city) && !unique.has(cityId(city))) unique.set(cityId(city), city)
    return [...unique.values()]
  } catch { return [] }
}

export function saveCities(cities: City[]): void {
  // Store location metadata only; weather and credentials are not part of this record.
  const locations = cities.map(({ name, country, lat, lon, state, local_names }) => ({ name, country, lat, lon, state, local_names }))
  try { window.localStorage.setItem(CITIES_STORAGE_KEY, JSON.stringify(locations)) }
  catch { throw new Error('Не удалось сохранить список городов. Разрешите сайту локальное хранилище и попробуйте ещё раз.') }
}
