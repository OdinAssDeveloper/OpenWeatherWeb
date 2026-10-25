import { API_KEY_STORAGE_KEY, readSavedApiKey, saveApiKey, removeSavedApiKey } from './keyStorage'
import { CITIES_STORAGE_KEY, cityId, readSavedCities, saveCities } from './cityStorage'
import PwaControls from './PwaControls'
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
const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ']
function Metric({ icon, label, value, detail }: { icon: IconName; label: string; value: string; detail?: string }) {
 return <article className="metric"><div className="metric-head"><span>{label}</span><Icon name={icon}/></div><strong>{value}</strong><small>{detail || 'По данным OpenWeather'}</small></article>
}

type WeatherState = { loading: boolean; weather?: Weather; error?: string }
function WeatherCard({ city: selected, apiKey, onRemove, onSettings }: {
 city: City; apiKey: string; onRemove(): void; onSettings(): void;
}) {
 const [state, setState] = useState<WeatherState>({ loading: true })
 const [revision, setRevision] = useState(0)
 useEffect(() => {
   if (!apiKey) { setState({ loading: false }); return }
   const controller = new AbortController()
   let active = true
   const timer = window.setTimeout(() => controller.abort(), 20000)
   setState({ loading: true })
   getWeather(selected, apiKey, controller.signal).then(weather => {
     if (active) setState({ loading: false, weather })
   }).catch(error => {
     if (active) setState({ loading: false, error: error instanceof ApiError ? error.message : 'Запрос прерван или сервис не ответил вовремя. Попробуйте ещё раз.' })
   }).finally(() => window.clearTimeout(timer))
   return () => { active = false; controller.abort(); window.clearTimeout(timer) }
 }, [selected.lat, selected.lon, apiKey, revision])
 const w = state.weather
 const sky = w?.weather[0]
 return <section className="weather-section saved-city" aria-label={'Погода: ' + cityName(selected)}>
   <div className="section-heading"><h2><Icon name="pin" size={17}/>{cityName(selected)} <span>{selected.country}</span></h2>
     <div className="city-actions"><button className="text-button" onClick={() => setRevision(value => value + 1)} disabled={state.loading || !apiKey} aria-label={'Обновить погоду: ' + cityName(selected)}><Icon name="refresh" size={16}/> Обновить</button><button className="icon-button" onClick={onRemove} aria-label={'Удалить город: ' + cityName(selected)}><Icon name="close" size={18}/></button></div>
   </div>
   <p className="city-location">{[selected.state, selected.country].filter(Boolean).join(', ')}</p>
   <div aria-live="polite">
     {!apiKey ? <div className="message">Подключите ключ OpenWeather для загрузки погоды.<button onClick={onSettings}>Подключить API</button></div> : state.loading ? <div className="city-loading"><span className="spinner"/> Обновляем погоду…</div> : state.error ? <div className="message error" role="alert">{state.error}<button onClick={() => setRevision(value => value + 1)}>Повторить</button>{state.error.includes('Ключ') && <button onClick={onSettings}>Изменить ключ</button>}</div> : null}
   </div>
   {w && <><p className="weather-updated">Обновлено в {localTime(w.dt, w.timezone)} · местное время</p><div className="weather-layout"><article className="weather-main"><div className="weather-title"><span>Сейчас в городе</span><span>{Math.abs(selected.lat).toFixed(2)}° {selected.lat < 0 ? 'S' : 'N'} / {Math.abs(selected.lon).toFixed(2)}° {selected.lon < 0 ? 'W' : 'E'}</span></div><div className="temperature"><strong>{Math.round(w.main.temp)}<sup>°</sup></strong><div className={'weather-symbol ' + (sky?.id === 800 ? 'clear' : '')}><Icon name={sky?.id === 800 ? 'sun' : 'cloud'} size={112}/></div></div><h3>{sky?.description}</h3><p>Ощущается как {Math.round(w.main.feels_like)}° <span>·</span> от {Math.round(w.main.temp_min)}° до {Math.round(w.main.temp_max)}°</p><div className="weather-main-bottom"><span><i/>Текущие наблюдения</span><span>°C / МЕТРИЧЕСКАЯ СИСТЕМА</span></div></article><div className="metrics-grid"><Metric icon="wind" label="Ветер" value={w.wind.speed + ' м/с'} detail={'Направление ' + directions[Math.round(w.wind.deg / 45) % 8]}/><Metric icon="drop" label="Влажность" value={w.main.humidity + '%'} detail="Относительная влажность"/><Metric icon="gauge" label="Давление" value={w.main.pressure + ' гПа'} detail="Атмосферное давление"/><Metric icon="eye" label="Видимость" value={Number.isFinite(w.visibility) ? (w.visibility / 1000).toLocaleString('ru-RU') + ' км' : '—'} detail={'Облачность ' + w.clouds.all + '%'}/></div></div><div className="sun-strip"><div><span className="sun-icon"><Icon name="rise" size={26}/></span><span><small>Восход</small><strong>{localTime(w.sys.sunrise, w.timezone)}</strong></span></div><div className="sun-path"><span/><Icon name="sun" size={19}/><span/></div><div><span className="sun-icon"><Icon name="set" size={26}/></span><span><small>Закат</small><strong>{localTime(w.sys.sunset, w.timezone)}</strong></span></div><p>Местное время<br/><span>в выбранном городе</span></p></div></>}
 </section>
}

export default function App() {
 const [cities, setCities] = useState(readSavedCities)
 const [key, setKey] = useState(readSavedApiKey)
 const [settings, setSettings] = useState(false)
 const [draftKey, setDraftKey] = useState('')
 const [storageError, setStorageError] = useState('')
 const [pageError, setPageError] = useState('')
 const [note, setNote] = useState('')
 const [adding, setAdding] = useState(false)
 const [query, setQuery] = useState('')
 const [results, setResults] = useState<City[]>([])
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 const [pendingRemoval, setPendingRemoval] = useState<City | null>(null)
 const keyDialog = useRef<HTMLDialogElement>(null)
 const searchDialog = useRef<HTMLDialogElement>(null)
 const removalDialog = useRef<HTMLDialogElement>(null)
 const controller = useRef<AbortController | null>(null)
 const requestId = useRef(0)
 useEffect(() => { if (settings) keyDialog.current?.showModal(); else keyDialog.current?.close() }, [settings])
 useEffect(() => { if (adding) searchDialog.current?.showModal(); else searchDialog.current?.close() }, [adding])
 useEffect(() => { if (pendingRemoval) removalDialog.current?.showModal(); else removalDialog.current?.close() }, [pendingRemoval])
 useEffect(() => () => controller.current?.abort(), [])
 useEffect(() => {
   const sync = (event: StorageEvent) => {
     if (event.key === CITIES_STORAGE_KEY || event.key === null) setCities(readSavedCities())
     if (event.key === API_KEY_STORAGE_KEY || event.key === null) {
       controller.current?.abort(); ++requestId.current; setBusy(false); setResults([])
       setKey(readSavedApiKey()); setDraftKey(''); setSettings(false); setStorageError('')
     }
   }
   window.addEventListener('storage', sync)
   return () => window.removeEventListener('storage', sync)
 }, [])
 function openSettings() { setStorageError(''); setDraftKey(key); setSettings(true) }
 function closeSearch() { controller.current?.abort(); ++requestId.current; setBusy(false); setAdding(false) }
 function openSearch() {
   if (!key) { setNote('Сначала подключите ключ OpenWeather, затем добавьте город.'); openSettings(); return }
   setQuery(''); setResults([]); setError(''); setAdding(true)
 }
 async function search(event: FormEvent) {
   event.preventDefault()
   if (!query.trim()) { setError('Введите название города.'); return }
   if (!key) { setError('Для поиска подключите ключ OpenWeather.'); return }
   controller.current?.abort()
   const abort = new AbortController(); controller.current = abort
   const id = ++requestId.current
   const timer = window.setTimeout(() => abort.abort(), 20000)
   setBusy(true); setError(''); setResults([])
   try {
     const found = await findCities(query, key, abort.signal)
     if (id !== requestId.current) return
     setResults(found)
     if (!found.length) setError('Город не найден. Уточните название или страну, например: London,GB.')
   } catch (e) { if (id === requestId.current) setError(e instanceof ApiError ? e.message : 'Сервис не ответил вовремя. Повторите поиск.') }
   finally { window.clearTimeout(timer); if (id === requestId.current) setBusy(false) }
 }
 function addCity(city: City) {
   const saved = readSavedCities()
   if (saved.some(item => cityId(item) === cityId(city))) { setCities(saved); setError('Этот город уже добавлен.'); return }
   const next = [...saved, city]
   try { saveCities(next) }
   catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить город.'); return }
   setCities(next); setPageError(''); setNote(''); closeSearch()
 }
 function removeCity() {
   if (!pendingRemoval) return
   const next = readSavedCities().filter(city => cityId(city) !== cityId(pendingRemoval))
   try { saveCities(next) }
   catch (e) { setPageError(e instanceof Error ? e.message : 'Не удалось сохранить список городов.'); setPendingRemoval(null); return }
   setCities(next); setPendingRemoval(null); setPageError('')
 }
 function saveKey(event: FormEvent) {
   event.preventDefault()
   try { saveApiKey(draftKey) }
   catch (error) { setStorageError(error instanceof Error ? error.message : 'Не удалось сохранить ключ.'); return }
   setKey(draftKey.trim()); setDraftKey(''); setStorageError(''); setSettings(false)
   setNote('Ключ подключён. Погода для сохранённых городов загружается автоматически.'); setError('')
 }
 function forgetKey() {
   try { removeSavedApiKey() }
   catch (error) { setStorageError(error instanceof Error ? error.message : 'Не удалось удалить ключ.'); return }
   controller.current?.abort(); ++requestId.current; setBusy(false); setKey(''); setDraftKey('')
   setStorageError(''); setSettings(false); setResults([])
   setNote('Ключ удалён. Список ваших городов сохранён.')
 }
 return <div className="app-shell">
   <header className="topbar"><a className="brand" href="./" aria-label="OpenWeatherWeb, главная"><span className="brand-icon"><Icon name="sun" size={25}/></span><span>OpenWeather<span className="brand-web">WEB</span></span></a><div className="header-right"><PwaControls/><span className="source"><i/> ДАННЫЕ OPENWEATHER</span><button className="key-button" onClick={openSettings}><Icon name="key" size={17}/>{key ? 'Ключ подключён' : 'Подключить API'}</button></div></header>
   <main>
     <section className="intro"><div><div className="eyebrow"><span/> Погода без лишних слов</div><h1>Ваши города.<br/><span>Ваша погода.</span></h1><p>Сохраните места, которые вам важны.<br/>При каждом открытии мы обновим для них погоду.</p></div><div className="intro-side"><span className="edition">ТЕКУЩАЯ ПОГОДА</span><div className="coordinates">{cities.length}</div><small>городов в вашем списке</small></div></section>
     <div className="cities-toolbar"><h2>Мои города <span>{cities.length}</span></h2><button className="primary" onClick={openSearch}><span aria-hidden="true">＋</span> Добавить город</button></div>
     <div aria-live="polite">{pageError && <div className="message error" role="alert">{pageError}</div>}{note && <div className="message">{note}</div>}</div>
     {!cities.length && <section className="empty-state"><div className="empty-art"><span className="orbit one"/><span className="orbit two"/><Icon name="sun" size={76}/><span className="art-dot"/></div><div className="empty-copy"><span className="eyebrow">ВАШ ЛИЧНЫЙ СПИСОК</span><h2>Какая погода<br/>в ваших городах?</h2><p>Добавьте первый город. Он останется в списке<br/>после перезапуска приложения или вкладки.</p><button className="outline-button" onClick={openSearch}>Добавить город<Icon name="arrow" size={18}/></button></div></section>}
     {cities.map(city => <WeatherCard key={cityId(city)} city={city} apiKey={key} onRemove={() => setPendingRemoval(city)} onSettings={openSettings}/>)}
     <div className="privacy-note"><Icon name="key" size={16}/><p>Города и ключ сохраняются в этом браузере. Для свежей погоды нужен интернет.</p><span>ХРАНИТСЯ В ВАШЕМ БРАУЗЕРЕ</span></div>
   </main>
   <footer><span>OpenWeatherWeb <span className="footer-dot">/</span> React + TypeScript</span><a href="https://openweathermap.org/" target="_blank" rel="noreferrer">Данные OpenWeather ↗</a></footer>
   <dialog ref={searchDialog} className="search-dialog" aria-labelledby="search-title" onCancel={closeSearch} onClose={closeSearch}>
     <div className="dialog-top"><span className="eyebrow">НОВОЕ МЕСТО</span><button className="icon-button" aria-label="Закрыть поиск" onClick={closeSearch}><Icon name="close"/></button></div>
     <h2 id="search-title">Добавить город</h2><p>Найдите город и выберите нужное место из списка.</p>
     <form className="search-form" onSubmit={search}><label htmlFor="city" className="search-label"><Icon name="search"/><span className="sr-only">Название города</span></label><input id="city" value={query} onChange={event => { setQuery(event.target.value); controller.current?.abort(); ++requestId.current; setBusy(false); setResults([]); setError('') }} placeholder="Город, например Рига" maxLength={120} autoComplete="off" autoFocus required/><button className="primary" disabled={busy}>{busy ? 'Поиск…' : 'Найти'}</button></form>
     <div aria-live="polite">{error && <div className="message error" role="alert">{error}</div>}{busy && <p>Ищем города…</p>}</div>
     {results.length > 0 && <div className="city-results"><p>Выберите город, чтобы сохранить его.</p><div className="city-grid">{results.map((city, index) => <button key={cityId(city) + ':' + index} onClick={() => addCity(city)}><Icon name="pin"/><span><strong>{cityName(city)}</strong><small>{[city.state, city.country].filter(Boolean).join(', ')} · {city.lat.toFixed(2)}°, {city.lon.toFixed(2)}°</small></span><Icon name="arrow" size={18}/></button>)}</div></div>}
   </dialog>
   <dialog ref={removalDialog} aria-labelledby="remove-title" onCancel={() => setPendingRemoval(null)} onClose={() => setPendingRemoval(null)}><h2 id="remove-title">Удалить город?</h2><p>«{pendingRemoval ? cityName(pendingRemoval) : ''}» будет удалён из сохранённых городов. Вы сможете добавить его снова.</p><div className="removal-actions"><button className="outline-button" onClick={() => setPendingRemoval(null)}>Отмена</button><button className="primary" onClick={removeCity}>Удалить город</button></div></dialog>
   <dialog aria-labelledby="key-title" ref={keyDialog} onCancel={() => { setDraftKey(''); setSettings(false) }} onClose={() => { setDraftKey(''); setSettings(false) }}><form onSubmit={saveKey}><div className="dialog-top"><span className="key-emblem"><Icon name="key" size={26}/></span><button type="button" className="icon-button" aria-label="Закрыть" onClick={() => { setDraftKey(''); setSettings(false) }}><Icon name="close"/></button></div><div className="eyebrow">ЛИЧНОЕ ПОДКЛЮЧЕНИЕ</div><h2 id="key-title">Ваш доступ к погоде</h2><p>Введите API-ключ OpenWeather. Он сохраняется в localStorage этого браузера и отправляется только OpenWeather по HTTPS.</p><label className="field-label" htmlFor="api-key">API-ключ</label><input id="api-key" type="password" value={draftKey} onChange={e => setDraftKey(e.target.value)} autoComplete="off" spellCheck={false} required placeholder="Вставьте личный ключ"/><small className="dialog-help">Ключ будет доступен после перезапуска SPA и PWA. Он хранится без шифрования; используйте только доверенное устройство.</small>{storageError && <p className="message error" role="alert">{storageError}</p>}<button className="primary dialog-submit">Подключить <Icon name="arrow" size={18}/></button><div className="dialog-links"><a href="https://home.openweathermap.org/api_keys" target="_blank" rel="noreferrer">Где взять ключ? ↗</a>{key && <button type="button" className="text-button" onClick={forgetKey}>Удалить сохранённый ключ</button>}</div></form></dialog>
 </div>
}
