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
import { FIELDS, GROUPS } from '../lib/config.js'

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
  return { registered: config, menu, all: registered, plugin, setLang: (l) => { lang = l } }
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

test('page：所有分组和字段都渲染，值来自宿主；改动后保存发出一次 mutate（带 revision）', async () => {
  const { registered } = loadClient()
  const form = fakeForm()
  const { host } = await mount(registered[0].render({ view: 'page', form }))
  assert.equal(host.querySelectorAll('[data-field]').length, FIELDS.length)
  assert.equal(host.querySelectorAll('section').length, GROUPS.length)
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

test('不再往侧栏 More 菜单里加同步项：刷新只在待办面板标题栏', () => {
  const { menu, all } = loadClient()
  assert.equal(menu, undefined)
  assert.equal(all.some((r) => r.options.name === 'sidebar.panellist.actions'), false)
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

test('标题栏：处理记录弹层列出决定，「还是建一条」发 rescan force，「忽略此发件人」发 sender', async () => {
  const { all } = loadClient()
  const main = all.find((r) => r.options.name === 'main')
  const posts = []
  globalThis.fetch = async (url, init) => {
    const path = String(url).replace('http://dsh.local/app/', '')
    posts.push([path, init?.body ? JSON.parse(init.body) : null])
    const result = path.endsWith('/activity') ? { items: [
      { at: '2026-11-12T13:00:00Z', account: 'qq', uid: 41, subject: '问卷：入职信息', from: 'HR', fromAddr: 'hr@corp.com', what: 'noise' },
      { at: '2026-11-12T12:00:00Z', account: 'qq', uid: 40, subject: '面试邀请', from: 'HR', fromAddr: 'hr@corp.com', what: 'todo', items: [{ what: 'todo', title: '公司：面试' }] },
    ], ignored: ['shop.com'], stats: { mails: 2, created: 1, moved: 0, cancelled: 0, llmCalls: 1, llmMs: 1500, cacheHits: 0, invites: 0 } }
      : path.endsWith('/list') ? { items: [], summary: { today: 0, overdue: 0, stale: 0, unplanned: 0 }, notices: [], staleDays: 7 }
        : path.endsWith('/notesList') ? { notes: [] } : path.endsWith('/categories') ? { categories: [] } : path.endsWith('/occurrences') ? { items: [] } : { ok: true, created: 1 }
    return { ok: true, status: 200, json: async () => ({ ok: true, result }) }
  }
  const { host, root } = await mount(React.createElement(main.render, { t: (k) => k }))
  await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
  assert.ok(host.querySelector('[data-inbox-planner-export]'), 'export button')
  await act(async () => { host.querySelector('[data-inbox-planner-log]').click() })
  await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
  const panel = host.querySelector('[data-inbox-planner-activity]')
  assert.ok(panel)
  assert.equal(panel.querySelectorAll('[data-activity-row]').length, 2)
  assert.match(panel.textContent, /公司：面试/)
  assert.match(panel.textContent, /shop\.com/)
  // Only the skipped mail offers "make a to-do anyway".
  const force = panel.querySelectorAll('[data-force]')
  assert.equal(force.length, 1)
  await act(async () => { force[0].click() })
  await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
  const rescan = posts.find(([p]) => p === 'inbox-planner/api/rescan')
  assert.deepEqual(rescan[1], { uid: 41, account: 'qq', force: true })
  await act(async () => { host.querySelector('[data-inbox-planner-activity] [data-ignore]').click() })
  await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
  assert.deepEqual(posts.find(([p]) => p === 'inbox-planner/api/sender')[1], { pattern: 'hr@corp.com', ignore: true })
  await act(async () => { root.unmount() })
})

test('提醒：提前 N 分钟、免打扰时段压住、跨午夜的免打扰、每日简报只发一次', () => {
  const { plugin } = loadClient()
  const { dueReminders, inQuiet } = plugin._test
  const cfg = { remindMinutes: 30, briefTime: '08:30', quietHours: '22:00-08:00' }
  const at = (h, m) => new Date(2026, 10, 14, h, m)
  const todos = [
    { id: 'a', title: '中国电信：笔试', dueDate: '2026-11-14', dueTime: '09:00' },
    { id: 'b', title: '交材料', dueDate: '2026-11-13' },
    { id: 'c', title: '下周的事', dueDate: '2026-11-20', dueTime: '09:00' },
    { id: 'd', title: '已完成', dueDate: '2026-11-14', dueTime: '09:00', done: true },
  ]
  assert.equal(inQuiet(at(23, 0), cfg.quietHours), true)
  assert.equal(inQuiet(at(7, 59), cfg.quietHours), true)
  assert.equal(inQuiet(at(8, 0), cfg.quietHours), false)
  assert.equal(inQuiet(at(13, 0), '12:00-14:00'), true)
  assert.equal(dueReminders(todos, cfg, at(7, 50), {}).length, 0, 'quiet hours hold everything')
  const r = dueReminders(todos, cfg, at(8, 35), {})
  assert.equal(JSON.stringify(r.map((x) => x.kind)), '["remind","brief"]')
  assert.equal(r[0].minutes, 25)
  assert.equal(r[1].today, 1)
  assert.equal(r[1].overdue, 1)
  const fired = Object.fromEntries(r.map((x) => [x.key, 1]))
  assert.equal(dueReminders(todos, cfg, at(8, 40), fired).length, 0)
  // Rescheduling re-arms the reminder: the key includes the date and time.
  const moved = [{ ...todos[0], dueTime: '10:00' }]
  assert.equal(dueReminders(moved, cfg, at(9, 45), fired).filter((x) => x.kind === 'remind').length, 1)
  assert.equal(dueReminders(todos, { remindMinutes: 0, briefTime: '', quietHours: '' }, at(8, 50), {}).length, 0)
})

test('红点：提醒到了只在侧栏待办图标右上角亮红点；打开待办页就清掉，开着时不再亮', async () => {
  const { all, plugin } = loadClient()
  const { badge } = plugin._test
  const nav = all.find((r) => r.options.name === 'sidebar.panellist')
  const main = all.find((r) => r.options.name === 'main')
  const icon = await mount(React.createElement(nav.render, { size: 16 }))
  assert.equal(icon.host.querySelector('[data-inbox-planner-badge]').getAttribute('data-inbox-planner-badge'), 'off')
  await act(async () => { badge.set(true) })
  assert.equal(icon.host.querySelector('[data-inbox-planner-badge]').getAttribute('data-inbox-planner-badge'), 'on')
  globalThis.fetch = async (url) => {
    const path = String(url)
    const result = path.endsWith('/list') ? { items: [], summary: { today: 0, overdue: 0, stale: 0, unplanned: 0 }, notices: [], staleDays: 7 }
      : path.endsWith('/notesList') ? { notes: [] } : path.endsWith('/categories') ? { categories: [] } : path.endsWith('/occurrences') ? { items: [] } : {}
    return { ok: true, status: 200, json: async () => ({ ok: true, result }) }
  }
  const page = await mount(React.createElement(main.render, { t: (k) => k }))
  await act(async () => { await new Promise((r) => setTimeout(r, 30)) })
  assert.equal(icon.host.querySelector('[data-inbox-planner-badge]').getAttribute('data-inbox-planner-badge'), 'off')
  await act(async () => { badge.set(true) })
  assert.equal(icon.host.querySelector('[data-inbox-planner-badge]').getAttribute('data-inbox-planner-badge'), 'off', 'page open: stays off')
  await act(async () => { page.root.unmount() })
  await act(async () => { badge.set(true) })
  assert.equal(icon.host.querySelector('[data-inbox-planner-badge]').getAttribute('data-inbox-planner-badge'), 'on')
  await act(async () => { icon.root.unmount() })
})

test.after(() => { setTimeout(() => process.exit(process.exitCode ?? 0), 50).unref?.() })
