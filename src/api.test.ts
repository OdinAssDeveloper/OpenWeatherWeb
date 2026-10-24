import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, findCities, getWeather, localTime, type City } from './api'
const city: City = { name: 'Казань', lat: 55.8, lon: 49.1, country: 'RU' }
afterEach(() => vi.unstubAllGlobals())
function respond(data: unknown, status = 200) { const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })); vi.stubGlobal('fetch', mock); return mock }
describe('Поиск города', () => {
 it('не отправляет запрос при пустом вводе', async () => { const mock = respond([]); await expect(findCities('  ', 'test')).rejects.toThrow('Введите'); expect(mock).not.toHaveBeenCalled() })
 it('проверяет город через geocoding и ограничивает число вариантов', async () => { const mock = respond([city]); expect(await findCities(' Казань ', 'test')).toEqual([city]); const url = mock.mock.calls[0][0] as URL; expect(url.pathname).toBe('/geo/1.0/direct'); expect(url.searchParams.get('q')).toBe('Казань'); expect(url.searchParams.get('limit')).toBe('5') })
 it('возвращает пустой список для неизвестного города', async () => { respond([]); expect(await findCities('missing', 'test')).toEqual([]) })
 it('отклоняет некорректные координаты', async () => { respond([{ ...city, lat: 'wrong' }]); await expect(findCities('Казань', 'test')).rejects.toBeInstanceOf(ApiError) })
})
describe('Погода и ошибки', () => {
 it('запрашивает погоду по координатам выбранного города', async () => { const weather = { main: { temp: 12 }, wind: {}, sys: {}, clouds: {}, weather: [{ description: 'ясно' }], dt: 100, timezone: 10800 }; const mock = respond(weather); expect(await getWeather(city, 'test')).toEqual(weather); const url = mock.mock.calls[0][0] as URL; expect(url.searchParams.get('lat')).toBe('55.8'); expect(url.searchParams.get('lon')).toBe('49.1'); expect(url.searchParams.get('units')).toBe('metric'); expect(url.searchParams.get('lang')).toBe('ru') })
 it.each([[401, 'Ключ'], [429, 'Лимит'], [500, 'недоступен']])('обрабатывает HTTP %s без раскрытия ключа', async (status, message) => { respond({}, status as number); await expect(findCities('Казань', 'secret-test')).rejects.toThrow(message as string) })
 it('не включает URL или ключ в сетевую ошибку', async () => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('url with secret-test'))); await expect(findCities('Казань', 'secret-test')).rejects.toThrow('Проверьте интернет'); try { await findCities('Казань', 'secret-test') } catch (e) { expect(String(e)).not.toContain('secret-test') } })
 it('пропускает отмену запроса', async () => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'))); await expect(findCities('Казань', 'test')).rejects.toMatchObject({ name: 'AbortError' }) })
 it('учитывает часовой пояс города и отсутствие восхода', () => { expect(localTime(0, 10800)).toBe('03:00'); expect(localTime(undefined, 0)).toBe('—') })
})
