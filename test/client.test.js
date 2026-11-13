/**
 * The browser half, loaded the way DSH's client module system loads it
 * (`window.__ModuleLoader__.load({ id, factory(require) })`) and rendered with real React in jsdom.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { JSDOM } from 'jsdom'
import { FIELDS } from '../lib/config.js'

const require = createRequire(import.meta.url)
const dom = new JSDOM('<!doctype html><div id="root"></div>', { pretendToBeVisual: true, url: 'http://dsh.local/app/' })
globalThis.window = dom.window
globalThis.document = dom.window.document

globalThis.HTMLElement = dom.window.HTMLElement
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const React = require('react')
const { createRoot } = require('react-dom/client')
const { act } = React

function loadClient() {
  let mod
  const sandbox = { window: { __ModuleLoader__: { load: (m) => { mod = m } }, setInterval, clearInterval, setTimeout, clearTimeout, addEventListener: (...a) => dom.window.addEventListener(...a), removeEventListener: (...a) => dom.window.removeEventListener(...a), matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) }, fetch: (...a) => globalThis.fetch(...a), document: globalThis.document, console, URL, setInterval, clearInterval, clearTimeout, requestAnimationFrame: (f) => setTimeout(f, 16), cancelAnimationFrame: clearTimeout, setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms) }
  vm.runInNewContext(readFileSync(new URL('../client.js', import.meta.url), 'utf8'), sandbox)
  assert.equal(mod.id, 'dsh-inbox-planner')
  const plugin = mod.factory((name) => { assert.equal(name, 'react'); return React })
  const registered = []
  let lang = 'zh'
  const ctx = {
    get: (n) => (n === 'locale' ? { register: () => () => {}, bind: () => (key) => (dicts[lang][key] ?? key) } : undefined),
    effect: (fn) => fn(),
    slots: { inject: (_name, fn) => fn(), register: (options, render) => { registered.push({ options, render }); return () => {} } },
  }
  const byNs = {}
  ctx.get = (n) => (n === 'locale' ? { register: (ns, d) => { byNs[ns] = d; return () => {} }, bind: (ns) => (key) => (byNs[ns]?.[lang]?.[key] ?? key) } : undefined)
  assert.equal(JSON.stringify(plugin.inject), '["slots"]')
  plugin.apply(ctx)
  const config = registered.filter((r) => r.options.name === 'plugins.row.config')
  const menu = registered.find((r) => r.options.name === 'sidebar.panellist.actions')
  return { registered: config, menu, all: registered, setLang: (l) => { lang = l } }
}

function fakeForm(overrides = {}) {
  const value = Object.fromEntries(FIELDS.map((f) => [f.key, f.def]))
  const calls = []
  const form = {
    calls,
    accept: true,
    state: { status: 'ready', value, base: value, user: {}, revision: 3, writable: true, ...overrides },
    mutate: async (ops, revision) => { calls.push({ ops, revision }); return form.accept },
  }
  return form
}

async function mount(element) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => { root.render(element) })
  return { host, root }
}

function setInput(el, value) {
  const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
  el.dispatchEvent(new window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
}

test('注册 plugins.row.config，键与插件页的 rowConfigKey 一致；summary 返回一句话', () => {
  const { registered } = loadClient()
  assert.equal(registered.length, 1)
  assert.equal(JSON.stringify(registered[0].options), JSON.stringify({ name: 'plugins.row.config', key: 'dsh-inbox-planner#inbox-planner' }))
  assert.match(registered[0].render({ view: 'summary' }), /待办/)
})

test('page：四个分组、20 个字段都渲染，值来自宿主；改动后保存发出一次 mutate（带 revision）', async () => {
  const { registered } = loadClient()
  const form = fakeForm()
  const { host } = await mount(registered[0].render({ view: 'page', form }))
  assert.equal(host.querySelectorAll('[data-field]').length, FIELDS.length)
  assert.equal(host.querySelectorAll('section').length, 4)
  assert.match(host.textContent, /检查间隔（秒）/)
  const poll = host.querySelector('[data-field="pollSeconds"] input')
  assert.equal(poll.value, '60')
  const save = [...host.querySelectorAll('button')].find((b) => b.textContent === '保存')
  assert.equal(save.disabled, true)
  await act(async () => { setInput(poll, '120') })
  await act(async () => { setInput(host.querySelector('[data-field="language"] select'), 'zh') })
  await act(async () => { host.querySelector('[data-field="annotateBoth"] input').click() })
  assert.match(host.textContent, /3 项未保存/)
  await act(async () => { save.click() })
  assert.equal(form.calls.length, 1)
  assert.equal(form.calls[0].revision, 3)
  assert.deepEqual(JSON.parse(JSON.stringify(form.calls[0].ops)).sort((a, b) => a.path[0].localeCompare(b.path[0])), [
    { op: 'set', path: ['annotateBoth'], value: false },
    { op: 'set', path: ['language'], value: 'zh' },
    { op: 'set', path: ['pollSeconds'], value: 120 },
  ])
  assert.match(host.textContent, /已保存/)
})

test('越界数字不能保存；宿主拒绝时提示并保留草稿', async () => {
  const { registered } = loadClient()
  const form = fakeForm()
  const { host } = await mount(registered[0].render({ view: 'page', form }))
  const save = () => [...host.querySelectorAll('button')].find((b) => /保存/.test(b.textContent))
  await act(async () => { setInput(host.querySelector('[data-field="pollSeconds"] input'), '999999') })
  assert.equal(save().disabled, true)
  await act(async () => { setInput(host.querySelector('[data-field="pollSeconds"] input'), '30') })
  form.accept = false
  await act(async () => { save().click() })
  assert.match(host.textContent, /保存失败/)
  assert.match(host.textContent, /1 项未保存/)
})

test('已修改的字段显示标记和「恢复默认」，点了发 unset', async () => {
  const { registered } = loadClient()
  const form = fakeForm({ user: { category: '邮件' }, value: { ...Object.fromEntries(FIELDS.map((f) => [f.key, f.def])), category: '邮件' } })
  const { host } = await mount(registered[0].render({ view: 'page', form }))
  const row = host.querySelector('[data-field="category"]')
  assert.match(row.textContent, /已修改/)
  assert.equal(row.querySelector('input').value, '邮件')
  await act(async () => { [...row.querySelectorAll('button')].find((b) => b.textContent === '恢复默认').click() })
  assert.deepEqual(JSON.parse(JSON.stringify(form.calls[0].ops)), [{ op: 'unset', path: ['category'] }])
})

test('只读、加载中、不可用三种状态', async () => {
  const { registered } = loadClient()
  const ro = await mount(registered[0].render({ view: 'page', form: fakeForm({ writable: false }) }))
  assert.match(ro.host.textContent, /只读/)
  assert.equal(ro.host.querySelector('[data-field="pollSeconds"] input').disabled, true)
  assert.equal([...ro.host.querySelectorAll('button')].some((b) => b.textContent === '保存'), false)
  const loading = await mount(registered[0].render({ view: 'page', form: fakeForm({ status: 'loading' }) }))
  assert.match(loading.host.textContent, /正在读取/)
  const gone = await mount(registered[0].render({ view: 'page', form: fakeForm({ status: 'unavailable' }) }))
  assert.match(gone.host.textContent, /没有提供/)
  const none = await mount(registered[0].render({ view: 'page' }))
  assert.match(none.host.textContent, /正在读取/)
})

test('英文界面：标签、分组和动态文案都是英文', async () => {
  const { registered, setLang } = loadClient()
  setLang('en')
  const { host } = await mount(registered[0].render({ view: 'page', form: fakeForm() }))
  assert.match(host.textContent, /Check interval \(s\)/)
  assert.match(host.textContent, /Basics/)
  await act(async () => { setInput(host.querySelector('[data-field="dedupeDays"] input'), '5') })
  assert.match(host.textContent, /1 unsaved/)
  assert.match(host.textContent, /Default: 3/)
})

test('client.js 与 client.src.js + lib/config.js 同步（构建产物没过期）', async () => {
  const { execFileSync } = await import('node:child_process')
  execFileSync(process.execPath, ['scripts/build-client.mjs', '--check'], { cwd: new URL('..', import.meta.url) })
})

test('select 选项文案按字段区分：语言的 auto 是「跟随系统」，引擎的 auto 是「自动」', async () => {
  const { registered } = loadClient()
  const { host } = await mount(registered[0].render({ view: 'page', form: fakeForm() }))
  const label = (key) => host.querySelector(`[data-field="${key}"] select`).selectedOptions[0].textContent
  assert.equal(label('language'), '跟随系统')
  assert.match(label('engine'), /^自动/)
  assert.equal(label('calendar'), '只写需要到场的事')
})

test('侧栏 More 菜单里的「立即同步」：POST inbox-planner/api/sync，显示结果，然后打开待办并关菜单', async () => {
  const { menu, all } = loadClient()
  assert.deepEqual(all.map((r) => `${r.options.name}:${r.options.key ?? r.options.id}`).sort(), ['main:inbox-todo', 'plugins.row.config:dsh-inbox-planner#inbox-planner', 'sidebar.panellist.actions:inbox-planner-sync', 'sidebar.panellist:inbox-todo'])
  assert.equal(JSON.stringify(menu.options), JSON.stringify({ name: 'sidebar.panellist.actions', id: 'inbox-planner-sync', order: 5 }))
  const calls = []
  globalThis.fetch = async (url, init) => { calls.push([url, init.method]); return { status: 200, json: async () => ({ ok: true, result: { ok: true, created: 2, scanned: 3, text: '' } }) } }
  const opened = []
  let dismissed = 0
  const { host } = await mount(menu.render({ entries: [{ id: 'inbox-todo', label: '待办', pinned: true }], onOpen: (id) => opened.push(id), onDismiss: () => { dismissed += 1 } }))
  const btn = host.querySelector('[data-inbox-planner-sync]')
  assert.match(btn.textContent, /立即同步邮件/)
  await act(async () => { btn.click() })
  assert.deepEqual(calls, [['http://dsh.local/app/inbox-planner/api/sync', 'POST']])
  assert.match(btn.textContent, /新增 2 条待办/)
  await act(async () => { await new Promise((r) => setTimeout(r, 1000)) })
  assert.deepEqual(opened, ['inbox-todo'])
  assert.equal(dismissed, 1)
})

test('同步失败时菜单项显示错误、不关菜单；没装待办面板时不去打开它', async () => {
  const { menu } = loadClient()
  globalThis.fetch = async () => ({ status: 403, json: async () => ({ ok: false, error: 'forbidden' }) })
  let dismissed = 0
  const { host } = await mount(menu.render({ entries: [], onOpen: () => { throw new Error('should not open') }, onDismiss: () => { dismissed += 1 } }))
  const btn = host.querySelector('[data-inbox-planner-sync]')
  await act(async () => { btn.click() })
  assert.match(btn.textContent, /同步失败: forbidden/)
  await act(async () => { await new Promise((r) => setTimeout(r, 1000)) })
  assert.equal(dismissed, 0)
})

test('自带的待办面板：走 inbox-planner/todo/api，标题栏有刷新图标；点了先同步邮件再重新加载列表', async () => {
  const { all } = loadClient()
  const main = all.find((r) => r.options.name === 'main')
  const calls = []
  globalThis.fetch = async (url) => {
    const path = String(url).replace('http://dsh.local/app/', '')
    calls.push(path)
    const result = path.endsWith('/sync') ? { ok: true, created: 1, scanned: 1, text: '' }
      : path.endsWith('/list') ? { items: [], summary: { today: 0, overdue: 0, stale: 0, unplanned: 0 }, notices: [], staleDays: 7 }
        : path.endsWith('/notesList') ? { notes: [] } : path.endsWith('/categories') ? { categories: [] } : path.endsWith('/occurrences') ? { items: [] } : {}
    return { status: 200, json: async () => ({ ok: true, result }) }
  }
  const { host, root } = await mount(React.createElement(main.render, { t: (k) => k }))
  await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
  assert.ok(calls.some((c) => c === 'inbox-planner/todo/api/list'), calls.join(','))
  assert.ok(!calls.some((c) => c.startsWith('todo/api/')))
  const icon = host.querySelector('[data-inbox-planner-refresh]')
  assert.ok(icon, 'refresh icon in header')
  const h2 = host.querySelector('h2')
  assert.equal(h2.nextElementSibling.contains(icon), true)
  const before = calls.filter((c) => c.endsWith('/list')).length
  await act(async () => { icon.click() })
  await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
  assert.ok(calls.includes('inbox-planner/api/sync'))
  assert.ok(calls.filter((c) => c.endsWith('/list')).length > before)
  assert.match(host.querySelector('[data-inbox-planner-refresh-result]').textContent, /新增 1 条待办/)
  await act(async () => { root.unmount() })
})

test.after(() => { setTimeout(() => process.exit(process.exitCode ?? 0), 50).unref?.() })
