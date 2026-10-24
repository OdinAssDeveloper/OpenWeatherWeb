export interface City { name: string; local_names?: Record<string, string>; lat: number; lon: number; country: string; state?: string }
export interface Weather {
  name: string; dt: number; timezone: number;
  weather: { id: number; main: string; description: string; icon: string }[];
  main: { temp: number; feels_like: number; temp_min: number; temp_max: number; humidity: number; pressure: number };
  wind: { speed: number; deg: number; gust?: number };
  clouds: { all: number }; visibility: number;
  sys: { sunrise?: number; sunset?: number; country: string }; rain?: Record<string, number>;
}
export class ApiError extends Error {}
async function request(path: string, params: Record<string, string>, key: string, signal?: AbortSignal): Promise<unknown> {
  const url = new URL(path, 'https://api.openweathermap.org');
  url.search = new URLSearchParams({ ...params, appid: key }).toString();
  let response: Response;
  try { response = await fetch(url, { signal, referrerPolicy: 'no-referrer' }); }
  catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Не удалось подключиться. Проверьте интернет и попробуйте ещё раз.');
  }
  if (!response.ok) {
    const message = response.status === 401 ? 'Ключ не принят OpenWeather. Проверьте его или дождитесь активации нового ключа.'
      : response.status === 429 ? 'Лимит запросов исчерпан. Попробуйте позже.'
      : 'OpenWeather временно недоступен. Попробуйте ещё раз.';
    throw new ApiError(message);
  }
  try { return await response.json(); } catch { throw new ApiError('OpenWeather вернул некорректный ответ.'); }
}
export async function findCities(query: string, key: string, signal?: AbortSignal): Promise<City[]> {
  if (!query.trim()) throw new ApiError('Введите название города.');
  const data = await request('/geo/1.0/direct', { q: query.trim(), limit: '5' }, key, signal);
  if (!Array.isArray(data) || !data.every(city => city && typeof city.name === 'string' && typeof city.country === 'string' && Number.isFinite(city.lat) && Number.isFinite(city.lon)))
    throw new ApiError('Не удалось прочитать список городов.');
  return data as City[];
}
export async function getWeather(city: City, key: string, signal?: AbortSignal): Promise<Weather> {
  const data = await request('/data/2.5/weather', { lat: String(city.lat), lon: String(city.lon), units: 'metric', lang: 'ru' }, key, signal) as Partial<Weather> | null;
  if (!data || !data.main || !data.wind || !data.sys || !data.clouds || !data.weather?.length || !Number.isFinite(data.main.temp) || !Number.isFinite(data.dt) || !Number.isFinite(data.timezone))
    throw new ApiError('Не удалось прочитать данные о погоде.');
  return data as Weather;
}
export function cityName(city: City) { return city.local_names?.ru || city.name; }
export function localTime(timestamp: number | undefined, offset: number) {
  if (timestamp === undefined) return '—';
  return new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }).format(new Date((timestamp + offset) * 1000));
}
