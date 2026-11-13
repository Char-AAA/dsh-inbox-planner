/**
 * dsh-inbox-planner — host half only.
 *
 * Mail comes from dsh-email's tools (email_list / email_read), so credentials stay in
 * dsh-email's settings; to-dos go into dsh-sidebar-todo through its personal_todo tool,
 * so they show up in that panel's list AND month calendar with no client code here.
 * Optionally mirrors dated items to dsh-calendar (calendar_create).
 */

import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { createPlanner, createStateFile } from './lib/planner.js'
import { resolveRoute } from './lib/llm.js'
import { Config as ConfigSchema, normalizeConfig, readDshLocale } from './lib/config.js'
import { t } from './lib/i18n.js'
import { createStore, resolveDataFile } from './lib/todo/store.js'
import { createApi as createTodoApi } from './lib/todo/api.js'
import { createTool as createTodoTool, createNoteTool } from './lib/todo/tool.js'

// DSH validates this row's config with it and renders the settings page from it.
export const Config = ConfigSchema
// Same pattern as dsh-sidebar-todo: tools is a core service, so ctx.tools is ready in apply().
export const inject = ['tools', 'webServer', 'connection']
export { normalizeConfig }

const TOOL_TIMEOUT_MS = 120000

/**
 * Run ONE tool through the host executor.
 *
 * Since DSH 0.2.1-rc.2, `ctx.tools.execute()` takes a complete raw batch
 * (`{ calls, signal }`, each call's `arguments` a JSON string) and returns
 * `{ results: [{ callId, result: { isError, value, content, error } }] }`; a
 * single call is a batch of one. The canonical `value` is execution-local and
 * present on success.
 */
export async function executeOne(tools, toolName, args) {
  if (!tools || typeof tools.execute !== 'function') throw new Error('tools service unavailable')
  const id = `inbox-planner-${randomUUID()}`
  const batch = await tools.execute({
    calls: [{ type: 'tool-call', id, name: toolName, arguments: JSON.stringify(args ?? {}) }],
    signal: AbortSignal.timeout(TOOL_TIMEOUT_MS),
  })
  const entry = Array.isArray(batch?.results)
    ? (batch.results.find((r) => r?.callId === id) ?? batch.results[0])?.result
    : undefined
  if (!entry || typeof entry !== 'object') throw new Error(`${toolName}: no result`)
  if (entry.isError === true) {
    const text = Array.isArray(entry.content) ? entry.content.map((b) => b?.text ?? '').join('').trim() : ''
    throw new Error(entry.error?.message || text || `${toolName} failed`)
  }
  if (entry.value === undefined) throw new Error(`${toolName}: result has no value (incompatible DSH version?)`)
  return entry.value
}

/**
 * The To-do + calendar half (adapted from dsh-sidebar-todo 0.3.1, MIT).
 * Same data file as dsh-sidebar-todo, so existing to-dos carry over. If dsh-sidebar-todo
 * is still running it owns personal_todo; we then stay out of the way (no second store
 * writing the same file) and the planner keeps writing through its tool.
 */
function applyTodo(ctx) {
  const conflict = () => ctx.tools.get?.('personal_todo') !== undefined
  if (conflict()) {
    ctx.logger?.warn?.('[inbox-planner] dsh-sidebar-todo is active; built-in To-do panel disabled. Disable dsh-sidebar-todo to use it.')
    return { active: false }
  }
  const store = createStore({ file: resolveDataFile(), staleDays: 7 })
  const ready = store.load()
  void ready.catch(() => {})
  const api = createTodoApi(store)
  const STATUS = { 'invalid-input': 400, 'not-found': 404, 'io-error': 500 }
  const PREFIX = '/inbox-planner/todo/api/'
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/inbox-planner/todo/api',
    handler: async (req, res) => {
      const send = (status, body) => {
        res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        res.end(JSON.stringify(body))
      }
      if (ctx.connection.requestRejection(req) !== undefined) return send(403, { ok: false, error: { code: 'forbidden', message: 'forbidden' } })
      if (req.method !== 'POST') return send(405, { ok: false, error: { code: 'method', message: 'POST only' } })
      const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname
      const method = pathname.startsWith(PREFIX) ? pathname.slice(PREFIX.length) : ''
      if (method === '' || method.includes('/') || !Object.hasOwn(api, method)) return send(404, { ok: false, error: { code: 'not-found', message: 'unknown method' } })
      try {
        await ready
        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        let body = {}
        try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {} } catch { body = {} }
        return send(200, { ok: true, result: await api[method](body) })
      } catch (err) {
        const code = err?.code ?? 'internal'
        return send(STATUS[code] ?? 500, { ok: false, error: { code, message: err?.message ?? 'to-do operation failed' } })
      }
    },
  }), 'dsh-inbox-planner: todo http')
  ctx.effect(() => ctx.tools.register(createTodoTool(api, ready)), 'dsh-inbox-planner: personal_todo')
  ctx.effect(() => ctx.tools.register(createNoteTool(api, ready)), 'dsh-inbox-planner: personal_note')
  ctx.effect(() => () => { void store.close() }, 'dsh-inbox-planner: todo store')
  return { active: true, store, api }
}

export function apply(ctx, rawConfig) {
  applyTodo(ctx)
  // Fields are volatile: read through normalizeConfig on every use so Settings edits apply live.
  const getConfig = () => normalizeConfig(rawConfig, { locale: readDshLocale(ctx) })
  const base = process.env.DSH_PROFILE_DIR || process.cwd()
  const store = createStateFile(join(base, 'data', 'dsh-inbox-planner', 'state.json'))

  const tools = () => ctx.tools ?? ctx.get?.('tools')
  const hasTool = (n) => { try { return tools()?.get?.(n) !== undefined } catch { return false } }

  const planner = createPlanner({
    callTool: (name, args) => executeOne(tools(), name, args),
    hasTool,
    route: () => resolveRoute(ctx, getConfig()),
    store,
    getConfig,
    log: { info: (m) => ctx.logger?.info?.(m), warn: (m) => ctx.logger?.warn?.(m) },
  })

  // ---- HTTP for the browser half's "Sync now" menu row (same auth as dsh-sidebar-todo's /todo/api) ----
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/inbox-planner/api',
    handler: async (req, res) => {
      const send = (status, body) => {
        res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        res.end(JSON.stringify(body))
      }
      if (ctx.connection.requestRejection(req) !== undefined) return send(403, { ok: false, error: 'forbidden' })
      if (req.method !== 'POST') return send(405, { ok: false, error: 'POST only' })
      const method = new URL(req.url ?? '/', 'http://dsh.internal').pathname.replace(/^\/inbox-planner\/api\/?/, '')
      try {
        const lang = getConfig().language
        if (method === 'sync') {
          const r = await planner.runOnce({ reason: 'button' })
          return send(200, { ok: true, result: { ok: r.ok, created: r.created.length, scanned: r.scanned, text: renderReport(r, lang) } })
        }
        if (method === 'status') {
          const v = await planner.status()
          return send(200, { ok: true, result: { ...v, text: renderReport(v, lang) } })
        }
        return send(404, { ok: false, error: 'unknown method' })
      } catch (error) {
        return send(500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'dsh-inbox-planner: http')

  // ---- Polling lives in the host: works with no page open and costs no chat turns ----
  ctx.effect(() => {
    let timer = null
    let stopped = false
    let failures = 0
    const schedule = (ms) => {
      if (stopped) return
      timer = setTimeout(tick, ms)
      timer.unref?.()
    }
    const tick = async () => {
      timer = null
      if (stopped) return
      const seconds = getConfig().pollSeconds
      if (seconds <= 0) { schedule(60000); return } // 关闭时每分钟看一眼设置是否又打开了
      try {
        if (!(await planner.isPaused())) {
          const res = await planner.runOnce({ reason: 'poll' })
          failures = res?.ok === false ? Math.min(failures + 1, 6) : 0
        }
      } catch (error) {
        failures = Math.min(failures + 1, 6)
        ctx.logger?.warn?.(`[inbox-planner] poll failed: ${error instanceof Error ? error.message : String(error)}`)
      }
      schedule(Math.min(seconds * 1000 * 2 ** failures, 15 * 60 * 1000))
    }
    // Give dsh-email / dsh-sidebar-todo a moment to register their tools after startup.
    schedule(15000)
    return () => { stopped = true; if (timer) clearTimeout(timer) }
  }, 'dsh-inbox-planner: poll')

  ctx.effect(() => ctx.tools.register({
    name: 'inbox_planner',
    description:
      'Inbox Planner plugin: automatically turns new emails that need the user\'s action into personal_todo items (with dates, shown in the to-do calendar). ' +
      'action=status shows the last run; sync checks new mail now; rescan re-analyses one mail (uid required); pause / resume stop or restart automatic processing. ' +
      'Call only when the user asks about mail-to-to-do syncing or asks to sync/rescan. ' +
      '「收件箱规划」：把需要用户处理的新邮件自动写进待办。',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['status', 'sync', 'rescan', 'pause', 'resume'] },
        uid: { type: ['integer', 'string'], description: 'Mail uid for rescan (integer for IMAP, string for POP3/AgentMail)' },
        account: { type: 'string', description: 'dsh-email account name for rescan; omit for the first mailbox' },
      },
      required: ['action'],
      additionalProperties: false,
    },
    output: {
      schema: { type: 'object' },
      render: (_args, v) => [{ type: 'text', text: renderReport(v, getConfig().language) }],
    },
    timeoutMs: 15 * 60 * 1000,
    async execute(args) {
      const a = args?.action
      if (a === 'sync') return planner.runOnce({ reason: 'manual' })
      if (a === 'rescan') {
        const ok = (Number.isInteger(args.uid) && args.uid > 0) || (typeof args.uid === 'string' && args.uid.trim() !== '')
        if (!ok) throw new Error('rescan requires uid')
        return planner.rescan(args.uid, typeof args.account === 'string' ? args.account.trim() : undefined)
      }
      if (a === 'pause') return planner.setPaused(true)
      if (a === 'resume') return planner.setPaused(false)
      return planner.status()
    },
  }), 'dsh-inbox-planner: tool')

  // ---- /inbox-sync: deterministic, never sent to the model ----
  ctx.inject(['commands'], (cmdCtx) => {
    cmdCtx.effect(() => {
      const commands = cmdCtx.get('commands')
      if (!commands || typeof commands.register !== 'function') return () => {}
      return commands.register({
        name: 'inbox-sync',
        description: t(getConfig().language).cmd,
        handler: async () => {
          const r = await planner.runOnce({ reason: 'command' })
          return { kind: r.ok ? 'success' : 'error', text: renderReport(r, getConfig().language) }
        },
      })
    }, 'dsh-inbox-planner: command')
  })
}

export function renderReport(v, lang = 'en') {
  const L = t(lang)
  if (!v || typeof v !== 'object') return String(v)
  if ('paused' in v && !('lastRun' in v) && !('created' in v)) return v.paused ? L.paused : L.resumed
  const r = 'lastRun' in v ? v.lastRun : v
  const head = 'lastRun' in v ? `${L.head(v)}\n` : ''
  if (!r) return `${head}${L.neverRan}`
  const lines = [`${head}${L.run({ ...r, at: localStamp(r.at) })}`]
  for (const c of r.created) lines.push(`+ ${c}`)
  for (const u of r.updated ?? []) lines.push(L.filled(u))
  if (r.calendar) lines.push(L.calendar(r.calendar))
  for (const d of r.decisions ?? []) {
    const what = Array.isArray(d.what) ? d.what.map(([k, title]) => `${L.decision[k]} ${title}`).join('；') : L.decision[d.what]
    lines.push(`· ${d.subject} — ${what}`)
  }
  for (const n of r.notices ?? []) lines.push(`ℹ ${n}`)
  for (const e of r.errors) lines.push(`! ${e}`)
  return lines.join('\n')
}

/** "2026-11-12T14:35:37.272Z" → "11-12 22:35" in the host's local time. */
export function localStamp(iso) {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return String(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`
}
