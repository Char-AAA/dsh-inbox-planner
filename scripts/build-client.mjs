#!/usr/bin/env node
/**
 * client.src.js + lib/config.js + vendor/sidebar-todo-client.js → client.js
 *
 * The To-do panel is dsh-sidebar-todo 0.3.1's browser half (MIT, see
 * vendor/LICENSE.dsh-sidebar-todo), embedded with a handful of exact edits. Every
 * edit must match exactly once, so a vendor update that moves code fails the build
 * instead of silently shipping a half-patched panel.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { FIELDS, GROUPS } from '../lib/config.js'

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

function once(src, from, to, what) {
  const n = src.split(from).length - 1
  if (n !== 1) throw new Error(`vendor patch "${what}" matched ${n} times (expected 1)`)
  return src.replace(from, to)
}

let todo = read('vendor/sidebar-todo-client.js').replace(/\r\n/g, '\n')
todo = once(todo, "window.__ModuleLoader__.load({\n  id: 'dsh-sidebar-todo',\n  factory(require) {", '({\n  factory(require) {', 'module wrapper')
todo = todo.replace(/\}\)\s*$/, '})')
todo = once(todo, "const NS = 'dsh-sidebar-todo'", "const NS = 'dsh-inbox-planner-todo'", 'locale namespace')
todo = once(todo, 'return new URL(`todo/api/${method}`, document.baseURI).href', 'return new URL(`inbox-planner/todo/api/${method}`, document.baseURI).href', 'api url')
todo = once(todo, "name: 'sidebar.panellist', id: 'todo', order: 20,", "name: 'sidebar.panellist', id: 'inbox-todo', order: 20,", 'panel id')
todo = once(todo, "name: 'main', key: 'todo', locale: NS,", "name: 'main', key: 'inbox-todo', locale: NS,", 'main key')
todo = once(todo, 'style[data-plugin-css="dsh-sidebar-todo"]', 'style[data-plugin-css="dsh-inbox-planner-todo"]', 'style lookup')
todo = once(todo, "el.dataset.pluginCss = 'dsh-sidebar-todo'", "el.dataset.pluginCss = 'dsh-inbox-planner-todo'", 'style tag')
todo = once(todo, "          h('h2', { style: S.h1 }, t('title')),\n",
  "          h('h2', { style: S.h1 }, t('title')),\n          __inboxBridge.SyncIcon ? h(__inboxBridge.SyncIcon, { t: __inboxBridge.t, onDone: reload }) : null,\n", 'header refresh icon')
todo = todo.replace(/\[dsh-sidebar-todo\]/g, '[dsh-inbox-planner todo]')
// Language: without a locale service fall back to English, not Chinese (DSH's own default).
todo = once(todo, "let t = (key) => dict.zh[key] ?? key", "let t = (key) => dict.en[key] ?? dict.zh[key] ?? key", 'fallback language')

const pick = ({ key, group, labelZh, labelEn, kind, def, min, max, options, zh, en }) =>
  ({ key, group, labelZh, labelEn, kind, def, ...(min !== undefined ? { min, max } : {}), ...(options ? { options } : {}), zh, en })

const out = once(once(once(read('client.src.js'),
  'const FIELDS = __FIELDS__', 'const FIELDS = ' + JSON.stringify(FIELDS.map(pick), null, 2).replace(/\n/g, '\n    '), 'fields'),
  'const GROUPS = __GROUPS__', 'const GROUPS = ' + JSON.stringify(GROUPS), 'groups'),
  'const __todoModule = __TODO_MODULE__', 'const __todoModule = ' + todo.replace(/\n/g, '\n    '), 'todo module')
  .replace(/^\/\*\n \* dsh-inbox-planner — browser half \(template\)\.[\s\S]*?\*\/\n/, '/* dsh-inbox-planner — browser half. GENERATED from client.src.js + vendor/sidebar-todo-client.js (MIT) by scripts/build-client.mjs; do not edit. */\n')

if (process.argv.includes('--check')) {
  if (read('client.js') !== out) { console.error('client.js is stale: run npm run build'); process.exit(1) }
} else {
  writeFileSync(new URL('../client.js', import.meta.url), out)
}
