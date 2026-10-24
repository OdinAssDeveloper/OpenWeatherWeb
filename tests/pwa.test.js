import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
const origin = 'https://odinassdeveloper.github.io'
const scope = origin + '/OpenWeatherWeb/'
function worker() {
 const handlers = {}
 const cache = { addAll: vi.fn().mockResolvedValue(undefined), match: vi.fn().mockResolvedValue(new Response('cached shell')) }
 const caches = { open: vi.fn().mockResolvedValue(cache), keys: vi.fn().mockResolvedValue(['openweatherweb-shell-old', 'other-app-cache', 'openweatherweb-shell-test']), delete: vi.fn().mockResolvedValue(true) }
 const fetch = vi.fn().mockResolvedValue(new Response('network'))
 const self = { registration: { scope }, location: { origin }, clients: { claim: vi.fn().mockResolvedValue(undefined) }, skipWaiting: vi.fn(), addEventListener: (name, handler) => { handlers[name] = handler } }
 const source = readFileSync(new URL('../scripts/sw-template.js', import.meta.url), 'utf8').replace('__VERSION__', 'test').replace('__PRECACHE__', JSON.stringify(['index.html', 'assets/app.js', 'manifest.webmanifest']))
 vm.runInNewContext(source, { self, caches, fetch, URL, Set, Promise, Request })
 return { handlers, cache, caches, fetch, self }
}
describe('PWA caching boundaries', () => {
 it.each([
  ['https://api.openweathermap.org/data/2.5/weather?appid=placeholder', 'GET', 'cors'],
  [scope + 'assets/app.js?appid=placeholder', 'GET', 'cors'],
  [scope + 'unknown.json', 'GET', 'cors'],
  [origin + '/another-app/', 'GET', 'navigate'],
  [scope + 'assets/app.js', 'POST', 'cors'],
 ])('does not intercept %s', (url, method, mode) => {
   const { handlers, caches } = worker(); const respondWith = vi.fn()
   handlers.fetch({ request: { url, method, mode }, respondWith })
   expect(respondWith).not.toHaveBeenCalled(); expect(caches.open).not.toHaveBeenCalled()
 })
 it('serves a cached navigation shell without requesting the network', async () => {
   const { handlers, cache, fetch } = worker(); let response
   handlers.fetch({ request: { url: scope, method: 'GET', mode: 'navigate' }, respondWith: promise => { response = promise } })
   expect(await (await response).text()).toBe('cached shell'); expect(cache.match).toHaveBeenCalledWith(scope + 'index.html'); expect(fetch).not.toHaveBeenCalled()
 })
 it('precaches only the application asset inventory', async () => {
   const { handlers, cache } = worker(); let completion
   handlers.install({ waitUntil: promise => { completion = promise } }); await completion
   const requests = cache.addAll.mock.calls[0][0]
   expect(requests.map(request => request.url)).toEqual([scope + 'index.html', scope + 'assets/app.js', scope + 'manifest.webmanifest'])
   expect(requests.every(request => request.cache === 'reload')).toBe(true)
 })
 it('removes only old caches belonging to this application', async () => {
   const { handlers, caches, self } = worker(); let completion
   handlers.activate({ waitUntil: promise => { completion = promise } }); await completion
   expect(caches.delete).toHaveBeenCalledExactlyOnceWith('openweatherweb-shell-old'); expect(self.clients.claim).toHaveBeenCalledOnce()
 })
 it('activates an update only on an explicit update message', () => {
   const { handlers, self } = worker(); handlers.message({ data: { type: 'OTHER' } }); expect(self.skipWaiting).not.toHaveBeenCalled()
   handlers.message({ data: { type: 'SKIP_WAITING' } }); expect(self.skipWaiting).toHaveBeenCalledOnce()
 })
})
describe('Install manifest', () => {
 it('stays scoped to the GitHub Pages project with standalone display', () => {
   const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
   expect(manifest.id).toBe('/OpenWeatherWeb/'); expect(manifest.scope).toBe(manifest.start_url); expect(manifest.display).toBe('standalone')
   expect(manifest.icons.some(icon => icon.sizes === '192x192')).toBe(true)
   expect(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable')).toBe(true)
 })
})
