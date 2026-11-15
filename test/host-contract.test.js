/**
 * End-to-end through apply(): every tool call goes through an executor that
 * follows the DSH >= 0.2.1-rc.2 batch contract exactly as documented in
 * docs/subsystems/tools.md (ToolBatchInput / ToolBatchResult / ToolExecutionResult).
 * The previous release passed its unit tests but would have thrown on the first
 * real call; this file exists so that can't happen again.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, executeOne } from '../index.js'

import { todoLib } from './helpers.js'
const TODO = todoLib()
// Fixture dates sit a month ahead of the real clock: apply() runs on real time.
const ahead = (d) => { const x = new Date(Date.now() + d * 86400e3); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
const D1 = ahead(30)
const D2 = ahead(31)
const { createStore } = await import(`${TODO}/store.js`)
const { createApi } = await import(`${TODO}/api.js`)
const { createTool } = await import(`${TODO}/tool.js`)

/** A tools service whose execute() mirrors executeToolBatch's input/output shapes. */
function strictToolsService() {
  const registry = new Map()
  return {
    registry,
    register(def) { registry.set(def.name, def); return () => registry.delete(def.name) },
    get(name) { return registry.get(name) },
    async execute(input) {
      const { calls, signal } = input // 与 executeToolBatch 相同的解构
      if (!(signal instanceof AbortSignal)) throw new TypeError('signal is required')
      const results = await Promise.all(calls.map(async (call) => { // 缺 calls 时这里 TypeError
        assert.equal(call.type, 'tool-call')
        assert.equal(typeof call.id, 'string')
        assert.equal(typeof call.arguments, 'string', 'arguments 必须是 JSON 字符串')
        const def = registry.get(call.name)
        if (!def) return { callId: call.id, result: { isError: true, error: { message: `unknown tool ${call.name}` }, content: [{ type: 'text', text: 'unknown tool' }] } }
        try {
          const value = await def.execute(JSON.parse(call.arguments), { signal })
          const content = def.output?.render ? def.output.render(JSON.parse(call.arguments), value) : [{ type: 'text', text: JSON.stringify(value) }]
          return { callId: call.id, result: { isError: false, value, content } }
        } catch (error) {
          return { callId: call.id, result: { isError: true, error: { message: error.message }, content: [{ type: 'text', text: `Error: ${error.message}` }] } }
        }
      }))
      return { results, additionalContexts: [], concluded: false }
    },
  }
}

function fakeLlm() {
  return {
    stream: async function* (opts) {
      const p = opts.messages[0].content[0].text
      assert.equal(typeof opts.system, 'string')
      const reply = p.includes('电信')
        ? { v: 1, actionable: true, items: [{ key: 'ctg-1114', title: '中国电信：线上笔试', dueDate: D1, dueTime: '09:00', priority: 'high', prep: '', quote: '' }] }
        : p.includes('苏州银行')
          ? { v: 1, actionable: true, items: [{ key: 'szb-interview', title: '苏州银行：现场面试', dueDate: D2, dueTime: '09:15', priority: 'high', prep: '带身份证和学生证', quote: '' }] }
          : { v: 1, actionable: false, items: [] }
      yield { type: 'text-delta', text: JSON.stringify(reply) }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
}

async function boot({ mails, listExtra = {} }) {
  const dir = await mkdtemp(join(tmpdir(), 'ip-host-'))
  process.env.DSH_PROFILE_DIR = dir
  const tools = strictToolsService()
  const store = createStore({ file: join(dir, 'data', 'dsh-todolist', 'todos.json') })
  const ready = store.load()
  tools.register(createTool(createApi(store), ready))
  tools.register({
    name: 'email_list',
    async execute({ limit = 20, offset = 0 }) {
      const sorted = [...mails].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
      return { account: 'default', folder: 'INBOX', count: mails.length, ...listExtra, messages: sorted.slice(offset, offset + limit).map(({ body, ...e }) => e) }
    },
  })
  tools.register({
    name: 'email_read',
    async execute({ uid }) {
      const m = mails.find((x) => x.uid === uid)
      if (!m) throw new Error('not found')
      return { ...m, text: m.body, attachments: [] }
    },
  })
  const commands = {}
  const routes = []
  const ctx = {
    tools,
    webServer: { register: (r) => { routes.push(r); return () => {} } },
    connection: { requestRejection: (req) => (req.headers?.forged ? 'forged' : undefined) },
    get: (n) => (n === 'tools' ? tools : n === 'llm' ? fakeLlm() : n === 'agentDefaultModel' ? { currentSelection: () => ({ provider: 'deepseek', model: 'deepseek-chat' }) } : n === 'commands' ? { register: (c) => { commands[c.name] = c; return () => {} } } : undefined),
    effect: (fn) => fn(),
    inject: (_d, fn) => fn(ctx),
    logger: {},
  }
  apply(ctx, { pollSeconds: 0, backfillDays: 3, language: 'zh' })
  const todos = async () => (await tools.get('personal_todo').execute({ action: 'list', view: 'open' })).items
  return { tools, commands, todos, routes }
}

const now = Date.now()
const ago = (h) => new Date(now - h * 3600e3).toISOString()

test('真实批次约定：/inbox-sync 跑通，待办带时间写进 sidebar-todo', async () => {
  const h = await boot({ mails: [
    { uid: 5401, subject: '中国电信线上笔试通知', from: { name: '中国电信', address: 'hr@ct.cn' }, date: ago(2), body: '11月14日9:00笔试' },
    { uid: 5402, subject: '您的验证码', from: 'no-reply@x.com', date: ago(1), body: '123456' },
  ] })
  const r = await h.commands['inbox-sync'].handler()
  assert.equal(r.kind, 'success', r.text)
  assert.match(r.text, /新增 1/)
  const [t] = await h.todos()
  assert.equal(t.title, '中国电信：线上笔试')
  assert.equal(t.dueDate, D1)
  assert.equal(t.dueTime, '09:00')
  assert.equal(t.category, '邮件')
  // 再跑一次：没有新邮件，不重复
  const r2 = await h.commands['inbox-sync'].handler()
  assert.match(r2.text, /新邮件 0 封/)
  assert.equal((await h.todos()).length, 1)
  // inbox_planner 工具自身也经执行器可用
  const s = await executeOne(h.tools, 'inbox_planner', { action: 'status' })
  assert.equal(s.account, 'default')
})

test('POP3 / AgentMail 字符串 uid、工具输出没有 uidValidity：照常增量，不误判重置', async () => {
  const mails = [{ uid: 'pop-aaa', subject: '苏州银行面试通知', from: 'hr@suzhoubank.com', date: ago(3), body: '11月15日上午9:15' }]
  const h = await boot({ mails })
  const r = await h.commands['inbox-sync'].handler()
  assert.match(r.text, /新增 1/)
  assert.doesNotMatch(r.text, /重建基线/)
  mails.push({ uid: 'pop-bbb', subject: '中国电信线上笔试通知', from: 'hr@ct.cn', date: new Date().toISOString(), body: '11月14日9:00' })
  const r2 = await h.commands['inbox-sync'].handler()
  assert.match(r2.text, /新邮件 1 封/)
  assert.match(r2.text, /新增 1/)
  assert.equal((await h.todos()).length, 2)
})

test('执行器报错时把宿主的错误信息带出来', async () => {
  const h = await boot({ mails: [] })
  await assert.rejects(executeOne(h.tools, 'no_such_tool', {}), /unknown tool no_such_tool/)
  await assert.rejects(executeOne(h.tools, 'email_read', { uid: 1 }), /not found/)
})

async function hit(route, { method = 'POST', path, headers = {}, body }) {
  const req = { method, url: path, headers, [Symbol.asyncIterator]: async function* () { if (body !== undefined) yield Buffer.from(JSON.stringify(body)) } }
  let status = 0
  let out = ''
  const res = { writeHead: (s) => { status = s }, end: (b) => { out = b } }
  await route.handler(req, res)
  return { status, body: JSON.parse(out) }
}

test('HTTP 路由：鉴权、只收 POST、sync 跑一轮并回报告、status、未知方法 404', async () => {
  const h = await boot({ mails: [{ uid: 9001, subject: '中国电信线上笔试通知', from: 'hr@ct.cn', date: ago(1), body: '11月14日9:00' }] })
  const [route] = h.routes
  assert.equal(route.kind, 'prefix')
  assert.equal(route.path, '/inbox-planner/api')
  assert.equal((await hit(route, { path: '/inbox-planner/api/sync', headers: { forged: 1 } })).status, 403)
  assert.equal((await hit(route, { method: 'GET', path: '/inbox-planner/api/sync' })).status, 405)
  const r = await hit(route, { path: '/inbox-planner/api/sync' })
  assert.equal(r.status, 200)
  assert.equal(r.body.result.created, 1)
  assert.match(r.body.result.text, /新增 1/)
  const st = await hit(route, { path: '/inbox-planner/api/status' })
  assert.equal(st.body.result.account, 'default')
  assert.equal((await hit(route, { path: '/inbox-planner/api/nope' })).status, 404)
})

test('HTTP 路由（0.4）：处理记录、忽略发件人、强制重看、导出 .ics、提醒设置', async () => {
  const h = await boot({ mails: [
    { uid: 9101, subject: '中国电信线上笔试通知', from: 'hr@ct.cn', date: ago(2), body: '11月14日9:00' },
    { uid: 9102, subject: '岗位推荐：本周精选', from: 'jobs@board.com', date: ago(1), body: '为你推荐' },
  ] })
  const [route] = h.routes
  await hit(route, { path: '/inbox-planner/api/sync' })
  const log = await hit(route, { path: '/inbox-planner/api/activity', body: { limit: 10 } })
  assert.equal(log.status, 200)
  assert.deepEqual(log.body.result.items.map((e) => e.what), ['noise', 'todo'])
  const ig = await hit(route, { path: '/inbox-planner/api/sender', body: { pattern: 'board.com', ignore: true } })
  assert.deepEqual(ig.body.result.ignored, ['board.com'])
  assert.equal((await hit(route, { path: '/inbox-planner/api/rescan', body: {} })).status, 400)
  const forced = await hit(route, { path: '/inbox-planner/api/rescan', body: { uid: 9102, force: true } })
  assert.equal(forced.body.result.created, 1)
  const ex = await hit(route, { path: '/inbox-planner/api/export' })
  assert.equal(ex.body.result.count, 1)
  assert.match(ex.body.result.ics, /BEGIN:VEVENT[\s\S]*SUMMARY:中国电信：线上笔试/)
  const cfg = await hit(route, { path: '/inbox-planner/api/client' })
  assert.deepEqual(cfg.body.result, { language: 'zh', remindMinutes: 30, briefTime: '08:30', quietHours: '22:00-08:00', remindStyle: 'dot' })
  const st = await hit(route, { path: '/inbox-planner/api/status' })
  assert.match(st.body.result.text, /累计/)
})

test('没装 dsh-sidebar-todo：插件自己提供 personal_todo / personal_note 和 /inbox-planner/todo/api，同步写进自己的存储', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ip-own-'))
  process.env.DSH_PROFILE_DIR = dir
  const tools = strictToolsService()
  const mails = [{ uid: 1, subject: '中国电信线上笔试通知', from: 'hr@ct.cn', date: ago(1), body: '11月14日9:00' }]
  tools.register({ name: 'email_list', async execute() { return { account: 'default', messages: mails.map(({ body, ...e }) => e) } } })
  tools.register({ name: 'email_read', async execute({ uid }) { const m = mails.find((x) => x.uid === uid); return { ...m, text: m.body } } })
  const routes = []
  const commands = {}
  const ctx = {
    tools, webServer: { register: (r) => { routes.push(r); return () => {} } }, connection: { requestRejection: () => undefined },
    get: (n) => (n === 'llm' ? fakeLlm() : n === 'agentDefaultModel' ? { currentSelection: () => ({ provider: 'p', model: 'm' }) } : n === 'commands' ? { register: (c) => { commands[c.name] = c; return () => {} } } : undefined),
    effect: (fn) => fn(), inject: (_d, fn) => fn(ctx), logger: {},
  }
  apply(ctx, { pollSeconds: 0, language: 'zh' })
  assert.ok(tools.get('personal_todo') && tools.get('personal_note'))
  const todoRoute = routes.find((r) => r.path === '/inbox-planner/todo/api')
  assert.ok(todoRoute)
  const r = await commands['inbox-sync'].handler()
  assert.match(r.text, /新增 1/)
  const listed = await hit(todoRoute, { path: '/inbox-planner/todo/api/list', body: {} })
  assert.equal(listed.status, 200)
  assert.equal(listed.body.result.items[0].title, '中国电信：线上笔试')
  assert.equal((await hit(todoRoute, { path: '/inbox-planner/todo/api/list', headers: { forged: 1 } })).status, 200) // 这里的 connection 不拒绝；鉴权在上一个用例里覆盖
})

test('dsh-sidebar-todo 还开着：自带面板让位，不注册第二个 personal_todo', async () => {
  const h = await boot({ mails: [] })
  const owners = [...h.tools.registry.values()].filter((d) => d.name === 'personal_todo')
  assert.equal(owners.length, 1)
  assert.equal(h.routes.some((r) => r.path === '/inbox-planner/todo/api'), false)
})
