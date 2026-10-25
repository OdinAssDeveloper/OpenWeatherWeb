import { useEffect, useRef, useState } from 'react'
interface InstallPrompt extends Event {
 prompt(): Promise<void>;
 userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export default function PwaControls() {
 const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
 const [installed, setInstalled] = useState(false)
 const [offline, setOffline] = useState(!navigator.onLine)
 const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
 const [help, setHelp] = useState(false)
 const [installing, setInstalling] = useState(false)
 const [updating, setUpdating] = useState(false)
 const dialog = useRef<HTMLDialogElement>(null)
 const reload = useRef(false)
 useEffect(() => {
   const media = window.matchMedia('(display-mode: standalone)')
   const checkInstalled = () => setInstalled(media.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
   checkInstalled()
   const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt) }
   const onInstalled = () => { setInstalled(true); setPrompt(null); setHelp(false) }
   const onOnline = () => setOffline(false)
   const onOffline = () => setOffline(true)
   window.addEventListener('beforeinstallprompt', onPrompt)
   window.addEventListener('appinstalled', onInstalled)
   window.addEventListener('online', onOnline)
   window.addEventListener('offline', onOffline)
   media.addEventListener('change', checkInstalled)
   return () => {
     window.removeEventListener('beforeinstallprompt', onPrompt)
     window.removeEventListener('appinstalled', onInstalled)
     window.removeEventListener('online', onOnline)
     window.removeEventListener('offline', onOffline)
     media.removeEventListener('change', checkInstalled)
   }
 }, [])
 useEffect(() => {
   if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
   let cancelled = false
   let cleanup = () => {}
   const onController = () => { if (reload.current) window.location.reload() }
   navigator.serviceWorker.addEventListener('controllerchange', onController)
   navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js', { scope: import.meta.env.BASE_URL, updateViaCache: 'none' }).then(registration => {
     if (cancelled) return
     if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting)
     const checkWorker = () => {
       const worker = registration.installing
       if (!worker) return
       const onState = () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(registration.waiting || worker) }
       worker.addEventListener('statechange', onState)
       const previousCleanup = cleanup
       cleanup = () => { previousCleanup(); worker.removeEventListener('statechange', onState) }
     }
     registration.addEventListener('updatefound', checkWorker)
     cleanup = () => registration.removeEventListener('updatefound', checkWorker)
     if (registration.installing) checkWorker()
     const onVisible = () => { if (document.visibilityState === 'visible') void registration.update().catch(() => {}) }
     document.addEventListener('visibilitychange', onVisible)
     const workerCleanup = cleanup
     cleanup = () => { workerCleanup(); document.removeEventListener('visibilitychange', onVisible) }
   }).catch(() => { /* Online SPA remains available when service workers are blocked. */ })
   return () => { cancelled = true; cleanup(); navigator.serviceWorker.removeEventListener('controllerchange', onController) }
 }, [])
 useEffect(() => { if (help) dialog.current?.showModal(); else dialog.current?.close() }, [help])
 async function install() {
   if (!prompt) { setHelp(true); return }
   setInstalling(true)
   try { await prompt.prompt(); await prompt.userChoice; setPrompt(null) }
   catch { setHelp(true) }
   finally { setInstalling(false) }
 }
 function update() {
   if (!waiting) return
   reload.current = true; setUpdating(true)
   waiting.postMessage({ type: 'SKIP_WAITING' })
 }
 return <>
   {!installed && <button className="install-button" onClick={install} disabled={installing}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>{installing ? 'Установка…' : 'Установить'}</button>}
   {(offline || waiting) && <aside className="pwa-notice" aria-live="polite">{offline && <p>Нет сети. Список городов доступен; для свежей погоды нужен интернет.</p>}{waiting && <div><span>Доступна новая версия приложения. Сохранённый ключ останется в этом браузере.</span><button onClick={update} disabled={updating}>{updating ? 'Обновление…' : 'Обновить'}</button></div>}</aside>}
   <dialog ref={dialog} className="install-dialog" onCancel={() => setHelp(false)} onClose={() => setHelp(false)} aria-labelledby="install-title"><div className="dialog-top"><span className="eyebrow">ВСЕГДА ПОД РУКОЙ</span><button className="icon-button" aria-label="Закрыть инструкцию установки" onClick={() => setHelp(false)}>✕</button></div><h2 id="install-title">Установите OpenWeather</h2><p>Приложение появится на главном экране и будет открываться в отдельном окне.</p><ol className="install-steps"><li><strong>iPhone / iPad · Safari</strong><span>Нажмите «Поделиться» → «На экран Домой». Если есть переключатель «Открывать как веб-приложение», включите его.</span></li><li><strong>Android · Chrome</strong><span>Откройте меню ⋮ → «Установить приложение» или «Добавить на главный экран».</span></li><li><strong>Компьютер · Chrome / Edge</strong><span>Нажмите значок установки в адресной строке или выберите установку приложения в меню браузера.</span></li></ol><p className="install-footnote">Если установка недоступна, откройте сайт в системном браузере. После первого открытия интерфейс работает без сети. Для получения погоды нужен интернет; ключ сохраняется локально в этом браузере.</p><button className="primary dialog-submit" onClick={() => setHelp(false)}>Понятно</button></dialog>
 </>
}
