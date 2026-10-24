import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ApiError, cityName, findCities, getWeather, localTime, type City, type Weather } from './api'

type IconName = 'sun' | 'search' | 'pin' | 'key' | 'arrow' | 'wind' | 'drop' | 'gauge' | 'eye' | 'cloud' | 'rise' | 'set' | 'close' | 'refresh'
function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
 const paths: Record<IconName, ReactNode> = {
 sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
 search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
 pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
 key: <><circle cx="8" cy="9" r="4"/><path d="m11 12 9 9m-3-3 3-3m-6 0 3-3"/></>,
 arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>, wind: <><path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h6a2 2 0 1 1-2 2"/></>,
 drop: <path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/>,
 gauge: <><path d="M4 19a10 10 0 1 1 16 0M12 6v2M5 11l2 1m10 0 2-1m-7 5 4-6"/><circle cx="12" cy="16" r="1"/></>,
 eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
 cloud: <path d="M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5.5 5.5 0 1 1 1 11Z"/>,
 rise: <><path d="M2 18h20M5 15a7 7 0 0 1 14 0M12 2v7m-3-4 3-3 3 3M2 11l2 1m16 0 2-1"/></>,
 set: <><path d="M2 18h20M5 15a7 7 0 0 1 14 0M12 2v7m-3-3 3 3 3-3M2 11l2 1m16 0 2-1"/></>,
 close: <path d="m6 6 12 12M6 18 18 6"/>, refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 3M18 18a8 8 0 0 1-13-3"/></>
 }
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
const demoCity: City = { name: 'Kazan', local_names: { ru: 'Казань' }, lat: 55.7887, lon: 49.1221, country: 'RU', state: 'Татарстан' }
const demoWeather: Weather = { name: 'Казань', dt: 1729760400, timezone: 10800, weather: [{ id: 800, main: 'Clear', description: 'ясно', icon: '01d' }], main: { temp: 14, feels_like: 12, temp_min: 11, temp_max: 16, humidity: 64, pressure: 1018 }, wind: { speed: 3.2, deg: 225 }, clouds: { all: 5 }, visibility: 10000, sys: { country: 'RU', sunrise: 1729739700, sunset: 1729776000 } }
const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ']
function Metric({ icon, label, value, detail }: { icon: IconName; label: string; value: string; detail?: string }) {
 return <article className="metric"><div className="metric-head"><span>{label}</span><Icon name={icon}/></div><strong>{value}</strong><small>{detail || 'По данным OpenWeather'}</small></article>
}
export default function App() {
 const [query, setQuery] = useState('')
 const [key, setKey] = useState('')
 const [draftKey, setDraftKey] = useState('')
 const [settings, setSettings] = useState(false)
 const [results, setResults] = useState<City[]>([])
 const [selected, setSelected] = useState<City | null>(null)
 const [weather, setWeather] = useState<Weather | null>(null)
 const [demo, setDemo] = useState(false)
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 const [note, setNote] = useState('')
 const controller = useRef<AbortController | null>(null)
 const dialog = useRef<HTMLDialogElement>(null)
 const requestId = useRef(0)
 useEffect(() => { if (settings) dialog.current?.showModal(); else dialog.current?.close() }, [settings])
 useEffect(() => () => controller.current?.abort(), [])
 function openSettings() { setDraftKey(key); setSettings(true) }
 function startRequest() {
   controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
   const id = ++requestId.current; const timer = window.setTimeout(() => abort.abort(), 20000);
   setBusy(true); setError(''); setNote(''); return { abort, id, timer }
 }
 async function search(event: FormEvent) {
   event.preventDefault()
   if (!query.trim()) { setError('Введите название города.'); return }
   if (!key) { openSettings(); setNote('Сначала подключите личный ключ OpenWeather.'); return }
   const { abort, id, timer } = startRequest(); setResults([]); setWeather(null); setSelected(null); setDemo(false)
   try {
     const cities = await findCities(query, key, abort.signal)
     if (id !== requestId.current) return
     if (!cities.length) { setNote('Город не найден. Проверьте название или уточните страну, например: London,GB.'); return }
     if (cities.length > 1) { setResults(cities); return }
     const data = await getWeather(cities[0], key, abort.signal)
     if (id === requestId.current) { setSelected(cities[0]); setWeather(data) }
   } catch (e) { if (id === requestId.current) setError(e instanceof ApiError ? e.message : 'Запрос прерван или сервис не ответил вовремя. Повторите поиск.') }
   finally { clearTimeout(timer); if (id === requestId.current) setBusy(false) }
 }
 async function selectCity(city: City) {
   const { abort, id, timer } = startRequest()
   try { const data = await getWeather(city, key, abort.signal); if (id === requestId.current) { setSelected(city); setWeather(data); setResults([]); setDemo(false) } }
   catch (e) { if (id === requestId.current) setError(e instanceof ApiError ? e.message : 'Не удалось завершить запрос. Попробуйте ещё раз.') }
   finally { clearTimeout(timer); if (id === requestId.current) setBusy(false) }
 }
 function showDemo() { controller.current?.abort(); ++requestId.current; setBusy(false); setDemo(true); setSelected(demoCity); setWeather(demoWeather); setResults([]); setError(''); setNote('') }
 function saveKey(event: FormEvent) { event.preventDefault(); if (!draftKey.trim()) return; controller.current?.abort(); ++requestId.current; setBusy(false); setResults([]); setKey(draftKey.trim()); setDraftKey(''); setSettings(false); setNote('Ключ подключён. Введите город и нажмите «Найти».'); setError('') }
 function forgetKey() { controller.current?.abort(); ++requestId.current; setBusy(false); setKey(''); setDraftKey(''); setSettings(false); setResults([]); setNote('Ключ удалён из памяти вкладки.') }
 const w = weather
 const sky = w?.weather[0]
 return <div className="app-shell">
   <header className="topbar"><a className="brand" href="./" aria-label="OpenWeatherWeb, главная"><span className="brand-icon"><Icon name="sun" size={25}/></span><span>OpenWeather<span className="brand-web">WEB</span></span></a><div className="header-right"><span className="source"><i/> ДАННЫЕ OPENWEATHER</span><button className="key-button" onClick={openSettings}><Icon name="key" size={17}/>{key ? 'Ключ подключён' : 'Подключить API'}</button></div></header>
   <main>
     <section className="intro"><div><div className="eyebrow"><span/> Погода без лишних слов</div><h1>Любой город.<br/><span>Ваша погода.</span></h1><p>От знакомых улиц до следующего путешествия.<br className="desktop-break"/> Узнайте, что происходит за окном — где угодно.</p></div><div className="intro-side"><span className="edition">01 / ТЕКУЩАЯ ПОГОДА</span><div className="coordinates">55°45′ N <span>•</span> 49°07′ E</div><small>Отправная точка — Казань</small></div></section>
     <form className="search-form" onSubmit={search}><label htmlFor="city" className="search-label"><Icon name="search"/><span className="sr-only">Название города</span></label><input id="city" name="city" value={query} onChange={e => setQuery(e.target.value)} placeholder="Введите город, например Казань" maxLength={120} autoComplete="off" required/><span className="search-hint">Город или город,страна</span><button className="primary" disabled={busy}>{busy ? <><span className="spinner"/> Поиск…</> : <>Найти <Icon name="arrow" size={19}/></>}</button></form>
     <div className="search-meta"><span><Icon name="pin" size={14}/> Сначала проверим город, затем покажем погоду</span><button className="text-button" onClick={showDemo} disabled={busy}>Посмотреть пример <span>↗</span></button></div>
     <div aria-live="polite" aria-atomic="true">{error && <div className="message error" role="alert">{error}{error.includes('Ключ') && <button onClick={openSettings}>Изменить ключ</button>}</div>}{note && <div className="message">{note}</div>}</div>
     {results.length > 0 && <section className="city-results" aria-label="Найденные города"><div className="section-heading"><h2>Уточним место</h2><span>{results.length} вариантов</span></div><p>Есть несколько совпадений. Выберите нужный город.</p><div className="city-grid">{results.map((city, i) => <button key={city.lat + ':' + city.lon + ':' + i} disabled={busy} onClick={() => selectCity(city)}><Icon name="pin"/><span><strong>{cityName(city)}</strong><small>{[city.state, city.country].filter(Boolean).join(', ')}</small></span><Icon name="arrow" size={18}/></button>)}</div></section>}
     {!w && results.length === 0 && <section className="empty-state"><div className="empty-art"><span className="orbit one"/><span className="orbit two"/><Icon name="sun" size={76}/><span className="art-dot"/></div><div className="empty-copy"><span className="eyebrow">МИР БЛИЖЕ, ЧЕМ КАЖЕТСЯ</span><h2>Какая погода<br/>в вашем городе?</h2><p>Начните с названия. Мы найдём точное место<br/>и соберём всё важное на одном экране.</p><button className="outline-button" onClick={key ? () => document.getElementById('city')?.focus() : openSettings}>{key ? 'Выбрать город' : 'Подключить ключ OpenWeather'}<Icon name="arrow" size={18}/></button></div><span className="empty-corner">СЕЙЧАС / В ЛЮБОЙ ТОЧКЕ МИРА</span></section>}
     {w && selected && <section className="weather-section" aria-label="Текущая погода"><div className="section-heading"><h2><Icon name="pin" size={17}/>{cityName(selected)} <span>{selected.country}</span></h2><span className={demo ? 'demo-badge' : 'live-badge'}>{demo ? 'ПРИМЕР · НЕ ТЕКУЩИЕ ДАННЫЕ' : 'ОБНОВЛЕНО В ' + localTime(w.dt, w.timezone)}</span></div><div className="weather-layout"><article className="weather-main"><div className="weather-title"><span>Сейчас в городе</span><span>{selected.lat.toFixed(2)}° N / {selected.lon.toFixed(2)}° E</span></div><div className="temperature"><strong>{Math.round(w.main.temp)}<sup>°</sup></strong><div className={'weather-symbol ' + (sky?.id === 800 ? 'clear' : '')}><Icon name={sky?.id === 800 ? 'sun' : 'cloud'} size={112}/></div></div><h3>{sky?.description}</h3><p>Ощущается как {Math.round(w.main.feels_like)}° <span>·</span> от {Math.round(w.main.temp_min)}° до {Math.round(w.main.temp_max)}°</p><div className="weather-main-bottom"><span><i/>{demo ? 'Демонстрационные данные' : 'Текущие наблюдения'}</span><span>°C / МЕТРИЧЕСКАЯ СИСТЕМА</span></div></article><div className="metrics-grid"><Metric icon="wind" label="Ветер" value={w.wind.speed + ' м/с'} detail={'Направление ' + directions[Math.round(w.wind.deg / 45) % 8]}/><Metric icon="drop" label="Влажность" value={w.main.humidity + '%'} detail="Относительная влажность"/><Metric icon="gauge" label="Давление" value={w.main.pressure + ' гПа'} detail="Атмосферное давление"/><Metric icon="eye" label="Видимость" value={Number.isFinite(w.visibility) ? (w.visibility / 1000).toLocaleString('ru-RU') + ' км' : '—'} detail={'Облачность ' + w.clouds.all + '%'}/></div></div><div className="sun-strip"><div><span className="sun-icon"><Icon name="rise" size={26}/></span><span><small>Восход</small><strong>{localTime(w.sys.sunrise, w.timezone)}</strong></span></div><div className="sun-path"><span/><Icon name="sun" size={19}/><span/></div><div><span className="sun-icon"><Icon name="set" size={26}/></span><span><small>Закат</small><strong>{localTime(w.sys.sunset, w.timezone)}</strong></span></div><p>Местное время<br/><span>в выбранном городе</span></p></div></section>}
     <div className="privacy-note"><Icon name="key" size={16}/><p>Ваш ключ — только в памяти этой вкладки. После перезагрузки подключите его заново.</p><span>БЕЗ ХРАНЕНИЯ КЛЮЧЕЙ</span></div>
   </main>
   <footer><span>OpenWeatherWeb <span className="footer-dot">/</span> React + TypeScript</span><a href="https://openweathermap.org/" target="_blank" rel="noreferrer">Данные OpenWeather ↗</a></footer>
   <dialog ref={dialog} onCancel={() => { setDraftKey(''); setSettings(false) }} onClose={() => { setDraftKey(''); setSettings(false) }}><form onSubmit={saveKey}><div className="dialog-top"><span className="key-emblem"><Icon name="key" size={26}/></span><button type="button" className="icon-button" aria-label="Закрыть" onClick={() => { setDraftKey(''); setSettings(false) }}><Icon name="close"/></button></div><div className="eyebrow">ЛИЧНОЕ ПОДКЛЮЧЕНИЕ</div><h2>Ваш доступ к погоде</h2><p>Введите API-ключ OpenWeather. Он отправляется только OpenWeather по HTTPS и не сохраняется на сайте.</p><label className="field-label" htmlFor="api-key">API-ключ</label><input id="api-key" type="password" value={draftKey} onChange={e => setDraftKey(e.target.value)} autoComplete="off" spellCheck={false} required placeholder="Вставьте личный ключ"/><small className="dialog-help">Ключ исчезнет после перезагрузки страницы. На Ubuntu храните его в Keyring.</small><button className="primary dialog-submit">Подключить <Icon name="arrow" size={18}/></button><div className="dialog-links"><a href="https://home.openweathermap.org/api_keys" target="_blank" rel="noreferrer">Где взять ключ? ↗</a>{key && <button type="button" className="text-button" onClick={forgetKey}>Удалить ключ из памяти</button>}</div></form></dialog>
 </div>
}
