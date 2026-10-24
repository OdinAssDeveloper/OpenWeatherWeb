import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_KEY_STORAGE_KEY, readSavedApiKey, removeSavedApiKey, saveApiKey } from './keyStorage'
let data: Map<string, string>
beforeEach(() => {
 data = new Map()
 vi.stubGlobal('window', { localStorage: {
   getItem: (key: string) => data.get(key) ?? null,
   setItem: (key: string, value: string) => { data.set(key, value) },
   removeItem: (key: string) => { data.delete(key) },
 } })
})
afterEach(() => vi.unstubAllGlobals())
describe('Persistent API key', () => {
 it('starts disconnected when no key is saved', () => { expect(readSavedApiKey()).toBe('') })
 it('saves the entered key and restores it on a subsequent read', () => {
   saveApiKey('  test-placeholder  ')
   expect(data.get(API_KEY_STORAGE_KEY)).toBe('test-placeholder')
   expect(readSavedApiKey()).toBe('test-placeholder')
 })
 it('replaces a previously connected key', () => {
   saveApiKey('old-placeholder'); saveApiKey('new-placeholder')
   expect(readSavedApiKey()).toBe('new-placeholder'); expect(data.size).toBe(1)
 })
 it('rejects empty keys without replacing the saved key', () => {
   saveApiKey('test-placeholder'); expect(() => saveApiKey('  ')).toThrow('Введите API-ключ')
   expect(readSavedApiKey()).toBe('test-placeholder')
 })
 it('deletes only this application key and does not restore it', () => {
   data.set('unrelated-setting', 'keep'); saveApiKey('test-placeholder'); removeSavedApiKey()
   expect(readSavedApiKey()).toBe(''); expect(data.get('unrelated-setting')).toBe('keep')
 })
 it('handles clearing the browser site data', () => {
   saveApiKey('test-placeholder'); data.clear(); expect(readSavedApiKey()).toBe('')
 })
 it('does not crash when localStorage access is blocked', () => {
   vi.stubGlobal('window', Object.defineProperty({}, 'localStorage', { get() { throw new Error('Blocked') } }))
   expect(readSavedApiKey()).toBe('')
   expect(() => saveApiKey('test-placeholder')).toThrow('Не удалось сохранить ключ')
   expect(() => removeSavedApiKey()).toThrow('Не удалось удалить сохранённый ключ')
 })
 it('does not report success when quota prevents a write', () => {
   window.localStorage.setItem = () => { throw new Error('Quota exceeded') }
   expect(() => saveApiKey('test-placeholder')).toThrow('Не удалось сохранить ключ')
   expect(readSavedApiKey()).toBe('')
 })
})
