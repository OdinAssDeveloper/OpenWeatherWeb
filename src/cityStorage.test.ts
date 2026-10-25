import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CITIES_STORAGE_KEY, cityId, readSavedCities, saveCities } from './cityStorage'
import type { City } from './api'

const riga: City = { name: 'Riga', local_names: { ru: 'Рига' }, lat: 56.95, lon: 24.1, country: 'LV' }
const london: City = { name: 'London', lat: 51.5, lon: -0.12, country: 'GB', state: 'England' }
let data: Map<string, string>
beforeEach(() => {
  data = new Map()
  vi.stubGlobal('window', { localStorage: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
  } })
})
afterEach(() => vi.unstubAllGlobals())

describe('Saved cities', () => {
  it('starts with an empty list', () => { expect(readSavedCities()).toEqual([]) })
  it('restores multiple cities in order with the coordinates and translated names', () => {
    saveCities([riga, london])
    expect(readSavedCities()).toEqual([riga, london])
  })
  it('distinguishes places with the same name by coordinates and ignores repeated places', () => {
    const otherLondon = { ...london, lat: 42.98, lon: -81.24, country: 'CA' }
    data.set(CITIES_STORAGE_KEY, JSON.stringify([london, { ...london, name: 'Лондон' }, otherLondon]))
    expect(readSavedCities()).toEqual([london, otherLondon])
  })
  it('persists removal of only the selected city and preserves unrelated storage', () => {
    data.set('unrelated', 'keep')
    saveCities([riga, london])
    saveCities(readSavedCities().filter(city => cityId(city) !== cityId(riga)))
    expect(readSavedCities()).toEqual([london])
    expect(data.get('unrelated')).toBe('keep')
    saveCities([])
    expect(readSavedCities()).toEqual([])
  })
  it.each(['bad json', '{}', 'null'])('handles malformed storage: %s', value => {
    data.set(CITIES_STORAGE_KEY, value)
    expect(readSavedCities()).toEqual([])
  })
  it('filters invalid locations while preserving usable records', () => {
    data.set(CITIES_STORAGE_KEY, JSON.stringify([null, {}, { ...riga, lat: 91 }, { ...riga, lon: '24' }, { ...riga, local_names: { ru: {} } }, london]))
    expect(readSavedCities()).toEqual([london])
  })
  it('stores location fields only', () => {
    saveCities([{ ...riga, weather: 'not persisted', apiKey: 'test-placeholder' } as City])
    expect(JSON.parse(data.get(CITIES_STORAGE_KEY)!)).toEqual([riga])
  })
  it('does not report success when storage writes are blocked', () => {
    saveCities([riga])
    window.localStorage.setItem = () => { throw new Error('Blocked') }
    expect(() => saveCities([riga, london])).toThrow('Не удалось сохранить список городов')
    expect(readSavedCities()).toEqual([riga])
  })
  it('handles blocked reads without crashing', () => {
    vi.stubGlobal('window', Object.defineProperty({}, 'localStorage', { get() { throw new Error('Blocked') } }))
    expect(readSavedCities()).toEqual([])
  })
})
