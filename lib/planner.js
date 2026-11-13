/** The pipeline: new mail → items → dedupe → conflicts → personal_todo (+ calendar). Host-agnostic and testable. */

import { readFile, writeFile, rename, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { isNoise, ruleExtract, sameTask, minutesApart } from './rules.js'
import { extractWithModel } from './llm.js'
import { t } from './i18n.js'

const PAGE = 30
const MAX_SCAN = 200
const SEEN_CAP = 3000
const KEY_CAP = 3000
const MARK = '#inbox-planner'

export function emptyBox() {
  return { uidValidity: null, lastUid: null, baselineAt: null, seen: {}, forced: [] }
}

export function emptyState() {
  return { v: 2, accounts: {}, keys: {}, events: {}, lastRun: null, paused: false }
}

/** v1 kept one mailbox at the top level; move it under its account name. */
export function migrateState(state) {
  if (state.v === 2 && state.accounts) return state
  const key = typeof state.account === 'string' && state.account !== '' ? state.account : DEFAULT_KEY
  const box = { ...emptyBox(), uidValidity: state.uidValidity ?? null, lastUid: state.lastUid ?? null, baselineAt: state.baselineAt ?? null, seen: state.seen ?? {}, forced: state.forced ?? [] }
  const next = { ...state, v: 2, accounts: { ...(state.accounts ?? {}) } }
  if (state.baselineAt != null || Object.keys(state.seen ?? {}).length) next.accounts[key] = box
  for (const k of ['account', 'uidValidity', 'lastUid', 'baselineAt', 'seen', 'forced', 'self']) delete next[k]
  return next
}

const DEFAULT_KEY = 'default'

export function createStateFile(file) {
  return {
    async load() {
      try {
        return migrateState({ ...emptyState(), ...JSON.parse(await readFile(file, 'utf8')) })
      } catch {
        return emptyState()
      }
    },
    async save(state) {
      await mkdir(dirname(file), { recursive: true })
      const tmp = `${file}.tmp`
      await writeFile(tmp, JSON.stringify(state, null, 2), 'utf8')
      await rename(tmp, file)
    },
  }
}

function trimMap(map, cap) {
  const keys = Object.keys(map ?? {})
  if (keys.length <= cap) return map ?? {}
  const sorted = keys.sort((a, b) => String(map[a]?.at ?? '').localeCompare(String(map[b]?.at ?? '')))
  const out = {}
  for (const k of sorted.slice(keys.length - cap)) out[k] = map[k]
  return out
}

function senderName(from) {
  if (typeof from === 'string') return from
  if (Array.isArray(from)) return from.map(senderName).join(', ')
  if (from && typeof from === 'object') return from.name || from.address || ''
  return ''
}

function addresses(list) {
  const out = []
  for (const e of Array.isArray(list) ? list : list ? [list] : []) {
    const raw = typeof e === 'string' ? e : e?.address
    const m = /[^\s<>"']+@[^\s<>"']+/.exec(String(raw ?? ''))
    if (m) out.push(m[0].toLowerCase())
  }
  return out
}

/** Local ISO with offset, e.g. 2026-11-14T09:00:00+08:00 (what dsh-calendar expects). */
export function localIso(day, time, addMinutes = 0) {
  const [y, mo, d] = day.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const at = new Date(y, mo - 1, d, h, mi + addMinutes)
  const pad = (n) => String(Math.abs(n)).padStart(2, '0')
  const off = -at.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}:00${sign}${pad(Math.trunc(off / 60))}:${pad(off % 60)}`
}

function nextDay(day) {
  const [y, m, d] = day.split('-').map(Number)
  const at = new Date(y, m - 1, d + 1)
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`
}

/**
 * @param {object} deps
 * @param {(name:string, args:object)=>Promise<any>} deps.callTool
 * @param {(name:string)=>boolean} deps.hasTool
 * @param {()=>object|null} deps.route  model route or null
 * @param {{load:Function, save:Function}} deps.store
 * @param {()=>object} deps.getConfig  normalized config, read fresh every run (settings are live)
 * @param {()=>Date} [deps.clock]
 * @param {{info?:Function, warn?:Function}} [deps.log]
 */
export function createPlanner({ callTool, hasTool, route, store, getConfig, clock = () => new Date(), log = {} }) {
  let running = null

  /** Open todos (for conflicts) plus done ones (so a finished task is never re-created from an old mail). */
  async function knownTodos() {
    const open = await callTool('personal_todo', { action: 'list', view: 'open' })
    const done = await callTool('personal_todo', { action: 'list', view: 'done' })
    const tag = (list, isDone) => (Array.isArray(list?.items) ? list.items : []).map((x) => ({ ...x, done: isDone }))
    return [...tag(open, false), ...tag(done, true)]
  }

  /**
   * Mailboxes to process: the configured subset, else every account dsh-email reports.
   * An OAuth account that is not logged in yet is skipped with a notice instead of
   * failing every run. Without email_health we fall back to dsh-email's default account.
   */
  async function discoverAccounts(config, report, L) {
    let found = []
    if (hasTool('email_health')) {
      try {
        const health = await callTool('email_health', {})
        for (const c of Array.isArray(health?.checks) ? health.checks : []) {
          const m = /^(?:账号|Account)\s+(.+)$/.exec(String(c?.name ?? ''))
          if (!m) continue
          const detail = String(c?.detail ?? '')
          const name = m[1].trim()
          if (/OAuth2/i.test(detail) && !/已登录|logged in/i.test(detail)) { report.notices.push(L.oauthPending(name)); continue }
          found.push({ name, self: addresses(detail.split(/[\s/（）()]+/)) })
        }
      } catch { /* fall through to the default account */ }
    }
    if (config.accounts.length) {
      const wanted = new Set(config.accounts)
      const known = new Map(found.map((a) => [a.name, a]))
      found = config.accounts.map((n) => known.get(n) ?? { name: n, self: [] }).filter((a) => wanted.has(a.name))
    }
    if (found.length === 0) found = [{ name: null, self: [] }]
    return found
  }

  /**
   * Envelopes not yet handled, oldest first.
   * IMAP uids are numbers and use a watermark; POP3 / AgentMail ids are strings and
   * use the `seen` set plus the baseline time. Pages back while a whole page is new.
   */
  async function newEnvelopes(state, accountName, now, config) {
    const scope = accountName ? { account: accountName } : {}
    const first = await callTool('email_list', { limit: PAGE, ...scope })
    const raw = Number(first?.uidValidity)
    const validity = Number.isFinite(raw) && raw > 0 ? raw : null
    let reset = false
    const validityChanged = validity !== null && state.uidValidity != null && validity !== state.uidValidity
    if (state.baselineAt != null && validityChanged) {
      reset = true
      state.lastUid = null
      state.baselineAt = null
    }
    if (validity !== null) state.uidValidity = validity
    const firstRun = state.baselineAt == null
    if (firstRun) state.baselineAt = new Date(now.getTime() - config.backfillDays * 86400000).toISOString()
    const since = Date.parse(state.baselineAt)
    const isNew = (m) => {
      if (m == null || (typeof m.uid !== 'number' && typeof m.uid !== 'string') || m.uid === '') return false
      if (state.seen[m.uid]) return false
      if (Array.isArray(state.forced) && state.forced.includes(m.uid)) return true
      if (typeof m.uid === 'number' && state.lastUid != null) return m.uid > state.lastUid
      const at = Date.parse(m.date ?? '')
      return Number.isFinite(at) ? at >= since : !firstRun
    }
    let messages = Array.isArray(first?.messages) ? first.messages : []
    const all = [...messages]
    let offset = PAGE
    while (messages.length === PAGE && messages.every(isNew) && offset < MAX_SCAN) {
      const page = await callTool('email_list', { limit: PAGE, offset, ...scope })
      messages = Array.isArray(page?.messages) ? page.messages : []
      all.push(...messages)
      offset += PAGE
    }
    const maxUid = all.reduce((m, x) => (typeof x?.uid === 'number' && x.uid > m ? x.uid : m), state.lastUid ?? 0)
    const picked = all.filter(isNew)
    const at = (m) => Date.parse(m.date ?? '') || 0
    picked.sort((a, b) => (typeof a.uid === 'number' && typeof b.uid === 'number' ? a.uid - b.uid : at(a) - at(b)))
    return { picked, maxUid, reset }
  }

  async function extract(mail, report, config, L) {
    const r = config.engine === 'rules' ? null : route()
    if (r !== null) {
      const res = await extractWithModel(r, mail, config, clock())
      report.llmCalls += 1
      if (res.ok) return { items: res.items, engine: 'llm' }
      report.errors.push(`uid ${mail.uid}: ${res.reason}`)
      if (config.engine === 'llm') throw new Error(res.reason)
    } else if (config.engine === 'llm') {
      throw new Error(L.noModel)
    }
    if (mail.audience === 'cc' && config.skipCcOnly) return { items: [], engine: 'rules' }
    return { items: ruleExtract(mail, clock()), engine: 'rules' }
  }

  function findConflicts(item, todos, config) {
    if (!config.conflictMinutes || !item.dueDate || !item.dueTime) return []
    return todos.filter((x) => {
      if (x.done || x.dueDate !== item.dueDate || !x.dueTime) return false
      const gap = minutesApart(x.dueTime, item.dueTime)
      return gap !== null && gap < config.conflictMinutes
    })
  }

  function noteFor(item, mail, conflicts, L) {
    const lines = [`📧 ${senderName(mail.from) || L.unknownSender} · ${String(mail.subject ?? '').slice(0, 80)}`]
    if (item.location) lines.push(`${L.location}: ${item.location}`)
    if (item.prep) lines.push(`${L.prep}: ${item.prep}`)
    if (item.quote) lines.push(`${L.quote}: ${item.quote}`)
    for (const c of conflicts) lines.push(L.conflict(c.dueTime, c.title.replace(/^⚠️\s*/, '')))
    lines.push(`${MARK}${mail.account ? ` account=${mail.account}` : ''} uid=${mail.uid}${item.key ? ` key=${item.key}` : ''}`)
    return lines.join('\n')
  }

  async function mirrorToCalendar(item, mail, todoId, state, config, report) {
    if (!wantsCalendar(item, config)) return false
    if (!hasTool('calendar_create')) { report.calendarMissing = true; return false }
    if (state.events[todoId]) return true
    const minutes = item.durationMinutes || config.eventMinutes
    const args = item.dueTime
      ? { summary: item.title, start: localIso(item.dueDate, item.dueTime), end: localIso(item.dueDate, item.dueTime, minutes) }
      : { summary: item.title, start: item.dueDate, end: nextDay(item.dueDate), allDay: true }
    if (item.location) args.location = item.location
    args.description = [item.prep, `${senderName(mail.from)} · ${mail.subject}`].filter(Boolean).join('\n')
    try {
      const res = await callTool('calendar_create', args)
      state.events[todoId] = { uid: res?.created?.uid ?? res?.uid ?? null, at: clock().toISOString() }
      report.calendar += 1
      return true
    } catch (error) {
      report.errors.push(`calendar: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }

  async function processMail(env, box, acc, state, todos, report, config, L) {
    const now = clock().toISOString()
    const label = report.multi && acc.name ? `[${acc.name}] ` : ''
    const noiseExtra = config.extraNoise ? safeRegex(config.extraNoise) : null
    if (isNoise({ subject: env.subject ?? '', from: senderName(env.from) }, noiseExtra)) {
      box.seen[env.uid] = { at: now, skip: 'noise' }
      report.noise += 1
      decide(report, label + (env.subject ?? ''), 'noise')
      return
    }
    const read = await callTool('email_read', { uid: env.uid, ...(acc.name ? { account: acc.name } : {}) })
    const self = config.selfAddresses.length ? config.selfAddresses : acc.self
    const to = addresses(read?.to)
    const cc = addresses(read?.cc)
    const audience = self.length === 0 ? 'unknown' : to.some((a) => self.includes(a)) ? 'to' : cc.some((a) => self.includes(a)) ? 'cc' : 'unknown'
    const mail = {
      uid: env.uid,
      subject: read?.subject ?? env.subject ?? '',
      from: senderName(read?.from ?? env.from),
      date: read?.date ?? env.date ?? '',
      body: typeof read?.text === 'string' ? read.text : '',
      attachments: Array.isArray(read?.attachments) ? read.attachments : [],
      audience,
      account: acc.name,
    }
    const { items, engine } = await extract(mail, report, config, L)
    report.processed += 1
    const created = []
    const outcome = []
    if (items.length === 0) decide(report, label + mail.subject, mail.audience === 'cc' && config.skipCcOnly ? 'cc' : 'none')
    for (const item of items) {
      if (item.key && state.keys[item.key]) { report.duplicates += 1; outcome.push(['dup', item.title]); continue }
      const dup = todos.find((x) => sameTask(x, item, { windowDays: config.dedupeDays }))
      if (dup) {
        report.duplicates += 1
        outcome.push(['dup', item.title])
        if (item.key) state.keys[item.key] = { id: dup.id, at: now }
        // 新邮件补上了原来缺的时间（"具体时间另行通知"之后的正式通知）：更新原条目。
        if (!dup.done && item.dueDate && (!dup.dueDate || (!dup.dueTime && item.dueTime && dup.dueDate === item.dueDate))) {
          const patch = { dueDate: item.dueDate, ...(item.dueTime ? { dueTime: item.dueTime } : {}), note: `${dup.note ?? ''}\n${L.timeUpdated(String(mail.subject).slice(0, 60))}`.trim() }
          await callTool('personal_todo', { action: 'update', id: dup.id, ...patch })
          Object.assign(dup, patch)
          report.updated.push(dup.title)
          await mirrorToCalendar({ ...item, title: dup.title }, mail, dup.id, state, config, report)
        }
        continue
      }
      const conflicts = findConflicts(item, todos, config)
      const res = await callTool('personal_todo', {
        action: 'add',
        title: conflicts.length ? `⚠️ ${item.title}` : item.title,
        note: noteFor(item, mail, conflicts, L),
        priority: item.priority,
        category: categoryFor(state, config),
        ...(item.dueDate ? { dueDate: item.dueDate } : {}),
        ...(item.dueDate && item.dueTime ? { dueTime: item.dueTime } : {}),
      })
      const added = res?.item
      if (!added?.id) continue
      if (config.annotateBoth) {
        for (const c of conflicts) {
          if (String(c.note ?? '').includes(added.id)) continue
          const note = `${c.note ?? ''}\n${L.conflict(item.dueTime, item.title)} (${added.id})`.trim()
          await callTool('personal_todo', { action: 'update', id: c.id, note })
          c.note = note
        }
      }
      todos.push({ ...added, done: false })
      if (item.key) state.keys[item.key] = { id: added.id, at: now }
      created.push(added.id)
      report.created.push(`${item.dueDate ? `${item.dueDate}${item.dueTime ? ' ' + item.dueTime : ''} ` : ''}${item.title}${conflicts.length ? ' ⚠️' : ''}`)
      const onCalendar = await mirrorToCalendar(item, mail, added.id, state, config, report)
      outcome.push([onCalendar ? 'todo+cal' : 'todo', item.title])
    }
    if (outcome.length) decide(report, label + mail.subject, outcome)
    box.seen[env.uid] = { at: now, engine, todos: created }
  }

  async function runOnce({ reason = 'poll' } = {}) {
    if (running) return running
    running = (async () => {
      const config = getConfig()
      const L = t(config.language)
      const startedAt = clock()
      const report = { reason, at: startedAt.toISOString(), scanned: 0, processed: 0, noise: 0, duplicates: 0, llmCalls: 0, calendar: 0, created: [], updated: [], decisions: [], notices: [], errors: [], ok: true }
      const state = await store.load()
      state.events ??= {}
      try {
        const missing = ['email_list', 'email_read', 'personal_todo'].filter((n) => !hasTool(n))
        if (missing.length) throw new Error(L.missingTools(missing))
        const accounts = await discoverAccounts(config, report, L)
        report.accounts = accounts.map((a) => a.name ?? DEFAULT_KEY)
        report.multi = accounts.length > 1
        let todos = null
        let failed = 0
        for (const acc of accounts) {
          const key = acc.name ?? DEFAULT_KEY
          const box = (state.accounts[key] ??= emptyBox())
          box.seen ??= {}
          box.forced ??= []
          const label = report.multi ? `[${key}] ` : ''
          try {
            const { picked, maxUid, reset } = await newEnvelopes(box, acc.name, startedAt, config)
            if (reset) report.notices.push(label + L.rebaseline)
            // 被 rescan 的旧邮件可能不在第一页：直接按 uid 读。
            for (const uid of box.forced) if (!picked.some((m) => m.uid === uid)) picked.push({ uid, subject: '', from: '' })
            report.scanned += picked.length
            if (picked.length && todos === null) todos = await knownTodos()
            let stop = false
            for (const env of picked) {
              try {
                await processMail(env, box, acc, state, todos, report, config, L)
              } catch (error) {
                report.errors.push(`${label}uid ${env.uid}: ${error instanceof Error ? error.message : String(error)}`)
                if (config.engine === 'llm') { stop = true; break } // 严格模式：不推进水位，下次重试
                box.seen[env.uid] = { at: clock().toISOString(), error: true }
              }
              if (typeof env.uid === 'number') box.lastUid = Math.max(box.lastUid ?? 0, env.uid)
              await store.save(state) // 一封一落盘：中途退出也不会重复处理
            }
            box.forced = box.forced.filter((u) => !box.seen[u])
            if (!stop && maxUid > 0) box.lastUid = Math.max(box.lastUid ?? 0, maxUid)
          } catch (error) {
            // 一个邮箱连不上（授权码过期、网络）不影响其他邮箱。
            failed += 1
            report.errors.push(label + (error instanceof Error ? error.message : String(error)))
          }
          box.seen = trimMap(box.seen, SEEN_CAP)
        }
        if (failed === accounts.length) report.ok = false
        // 没装 dsh-calendar 只提示一次：很多人只用待办面板自带的月历，不该每轮都看到这句。
        if (report.calendarMissing && !state.calendarNoticeShown) { report.notices.push(L.calendarMissing); state.calendarNoticeShown = true }
        if (!report.calendarMissing && hasTool('calendar_create')) state.calendarNoticeShown = false
      } catch (error) {
        report.ok = false
        report.errors.push(error instanceof Error ? error.message : String(error))
      }
      delete report.calendarMissing
      delete report.multi
      state.keys = trimMap(state.keys, KEY_CAP)
      state.events = trimMap(state.events, KEY_CAP)
      state.lastRun = { ...report, errors: report.errors.slice(0, 10), ms: clock().getTime() - startedAt.getTime() }
      await store.save(state)
      if (report.created.length) log.info?.(`[inbox-planner] +${report.created.length}: ${report.created.join('; ')}`)
      if (!report.ok) log.warn?.(`[inbox-planner] ${report.errors.join('; ')}`)
      return state.lastRun
    })()
    try { return await running } finally { running = null }
  }

  /** Forget one mail so the next run reads it again (does not delete todos it made). */
  async function rescan(uid, account) {
    const state = await store.load()
    const key = account || Object.keys(state.accounts)[0] || DEFAULT_KEY
    const box = (state.accounts[key] ??= emptyBox())
    delete box.seen[uid]
    box.forced = [...new Set([...(box.forced ?? []), uid])] // 只放行这一封，水位和基线不动
    await store.save(state)
    return runOnce({ reason: `rescan ${account ? `${account}/` : ''}${uid}` })
  }

  async function status() {
    const state = await store.load()
    const r = route()
    const keys = Object.keys(state.accounts)
    return {
      account: keys.join(', ') || null,
      accounts: Object.fromEntries(keys.map((k) => [k, { lastUid: state.accounts[k].lastUid, seen: Object.keys(state.accounts[k].seen ?? {}).length }])),
      paused: state.paused,
      seen: keys.reduce((n, k) => n + Object.keys(state.accounts[k].seen ?? {}).length, 0),
      lastRun: state.lastRun,
      model: r ? `${r.provider}/${r.model}` : null,
    }
  }

  async function setPaused(paused) {
    const state = await store.load()
    state.paused = Boolean(paused)
    await store.save(state)
    return { paused: state.paused }
  }

  return { runOnce, rescan, status, setPaused, isPaused: async () => (await store.load()).paused }
}

/** Should this item also become a calendar event? */
export function wantsCalendar(item, config) {
  if (!item.dueDate || config.calendar === 'off') return false
  if (config.calendar === 'all') return true
  return item.kind === 'event' && Boolean(item.dueTime)
}

/** One line per mail saying what the planner decided, for the run report. */
function decide(report, subject, what) {
  if (report.decisions.length >= 30) return
  report.decisions.push({ subject: String(subject ?? '').slice(0, 60), what })
}

/** Explicit setting wins; otherwise the category picked on first run, persisted so it never flips. */
function categoryFor(state, config) {
  if (config.category) return config.category
  if (typeof state.category !== 'string' || state.category === '') state.category = config.categoryDefault || 'Mail'
  return state.category
}

function safeRegex(src) {
  try { return new RegExp(src, 'i') } catch { return null }
}
