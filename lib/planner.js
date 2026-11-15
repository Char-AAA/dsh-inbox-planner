/** The pipeline: new mail → items → dedupe → conflicts → personal_todo (+ calendar). Host-agnostic and testable. */

import { readFile, writeFile, rename, mkdir, unlink, stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { isNoise, ruleExtract, sameTask, minutesApart, dayKey } from './rules.js'
import { extractWithModel, cleanBody } from './llm.js'
import { parseInvite, isInviteAttachment } from './ics.js'
import { t } from './i18n.js'

const PAGE = 30
const MAX_SCAN = 200
const SEEN_CAP = 3000
const KEY_CAP = 3000
const CACHE_CAP = 600
const CACHE_DAYS = 14
const LOG_CAP = 200
const FOLLOW_UP_DAYS = 120
const MARK = '#inbox-planner'

export function emptyBox() {
  return { uidValidity: null, lastUid: null, baselineAt: null, seen: {}, forced: [] }
}

export function emptyState() {
  return { v: 2, accounts: {}, keys: {}, events: {}, cache: {}, log: [], senders: { ignore: [] }, stats: null, lastRun: null, paused: false }
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

  /** Content fingerprint: the same notice forwarded to two mailboxes, or sent twice, costs one model call. */
  function fingerprint(mail) {
    const subject = String(mail.subject ?? '').replace(/^((re|fw|fwd|回复|转发)\s*[:：]\s*)+/i, '').trim().toLowerCase()
    // The sent day is part of it: "tomorrow at 9" in identical text on two days means two dates.
    const sent = Number.isFinite(Date.parse(mail.date)) ? dayKey(new Date(mail.date)) : ''
    return createHash('sha256').update(`${sent}\n${subject}\n${cleanBody(mail.body).slice(0, 4000)}`).digest('hex').slice(0, 24)
  }

  /** A calendar invitation attached to the mail → items, or null. Never throws. */
  async function readInvite(mail, acc, config) {
    if (!config.invites || !hasTool('email_attachment')) return null
    const index = mail.attachments.findIndex(isInviteAttachment)
    if (index < 0) return null
    try {
      const res = await callTool('email_attachment', { uid: mail.uid, index, ...(acc.name ? { account: acc.name } : {}) })
      const path = typeof res?.path === 'string' ? res.path : ''
      if (path === '') return null
      const info = await stat(path)
      if (info.size > 512 * 1024) return null
      const text = await readFile(path, 'utf8')
      // dsh-email saves into its download folder; this copy was only for us.
      if (/\.ics$/i.test(path) && Math.abs(info.size - Number(res.size ?? info.size)) < 4) await unlink(path).catch(() => {})
      const parsed = parseInvite(text, clock())
      return parsed && parsed.items.length ? parsed.items.slice(0, config.maxItemsPerMail) : null
    } catch {
      return null
    }
  }

  /** Mail → items. Order: invitation file, cached result for identical content, model, rules. */
  async function extract(mail, acc, state, config, L, metrics) {
    const fp = fingerprint(mail)
    const invite = await readInvite(mail, acc, config)
    if (invite) { metrics.invites += 1; return { items: invite, engine: 'ics', fp } }
    const hit = state.cache?.[fp]
    if (hit && Date.parse(hit.at) > clock().getTime() - CACHE_DAYS * 86400000) {
      metrics.cacheHits += 1
      return { items: (hit.items ?? []).filter((i) => !i.dueDate || i.dueDate >= dayKey(clock()) || i.change === 'cancel'), engine: `${hit.engine}·cache`, fp }
    }
    const r = config.engine === 'rules' ? null : route()
    if (r !== null) {
      const t0 = Date.now()
      const res = await extractWithModel(r, mail, config, clock())
      metrics.llmCalls += 1
      metrics.llmMs += Date.now() - t0
      if (res.ok) return { items: res.items, engine: 'llm', fp, cacheable: true }
      metrics.errors.push(`uid ${mail.uid}: ${res.reason}`)
      if (config.engine === 'llm') throw new Error(res.reason)
    } else if (config.engine === 'llm') {
      throw new Error(L.noModel)
    }
    if (mail.audience === 'cc' && config.skipCcOnly && !mail.always) return { items: [], engine: 'rules', fp }
    return { items: ruleExtract(mail, clock()), engine: 'rules', fp }
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
    const lines = [`📧 ${mail.from || L.unknownSender} · ${String(mail.subject ?? '').slice(0, 80)}`]
    if (item.source === 'ics') lines.push(`📅 ${L.invite}`)
    if (item.location) lines.push(`${L.location}: ${item.location}`)
    if (item.prep) lines.push(`${L.prep}: ${item.prep}`)
    if (item.quote) lines.push(`${L.quote}: ${item.quote}`)
    const files = mail.attachments.map((a) => a?.filename).filter((n) => n && !/\.ics$/i.test(n)).slice(0, 5)
    if (files.length) lines.push(`📎 ${L.attachments}: ${files.join(', ')}`)
    for (const c of conflicts) lines.push(L.conflict(c.dueTime, c.title.replace(/^⚠️\s*/, '')))
    lines.push(`${MARK}${mail.account ? ` account=${mail.account}` : ''} uid=${mail.uid}${item.key ? ` key=${item.key}` : ''}`)
    return lines.join('\n')
  }

  function eventArgs(item, config) {
    const minutes = item.durationMinutes || config.eventMinutes
    return item.dueTime
      ? { start: localIso(item.dueDate, item.dueTime), end: localIso(item.dueDate, item.dueTime, minutes) }
      : { start: item.dueDate, end: nextDay(item.dueDate), allDay: true }
  }

  async function mirrorToCalendar(item, mail, todoId, state, config, report) {
    if (!wantsCalendar(item, config)) return false
    if (!hasTool('calendar_create')) { report.calendarMissing = true; return false }
    if (state.events[todoId]) return true
    const args = { summary: item.title, ...eventArgs(item, config) }
    if (item.location) args.location = item.location
    args.description = [item.prep, `${mail.from} · ${mail.subject}`].filter(Boolean).join('\n')
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

  /** Move or drop the calendar event mirrored for a to-do. Best effort. */
  async function syncCalendar(todoId, item, state, config, report, remove) {
    const ev = state.events[todoId]
    if (!ev?.uid) return
    try {
      if (remove) {
        if (!hasTool('calendar_delete')) return
        await callTool('calendar_delete', { uid: ev.uid })
        delete state.events[todoId]
      } else if (item.dueDate && hasTool('calendar_update')) {
        await callTool('calendar_update', { uid: ev.uid, ...eventArgs(item, config) })
      }
    } catch (error) {
      report.errors.push(`calendar: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /** The open to-do a reschedule / cancellation refers to: same key first, then same organisation + kind. */
  function followUpTarget(item, todos, state) {
    const byKey = item.key ? state.keys[item.key]?.id : null
    const open = todos.filter((x) => !x.done)
    if (byKey) { const hit = open.find((x) => x.id === byKey); if (hit) return hit }
    const probe = item.change === 'cancel' ? { ...item, dueDate: item.dueDate || '' } : { ...item, dueDate: '' }
    const candidates = open.filter((x) => sameTask(x, probe, { windowDays: FOLLOW_UP_DAYS }))
    // Prefer what this plugin created, then the soonest.
    candidates.sort((a, b) => Number(String(b.note ?? '').includes(MARK)) - Number(String(a.note ?? '').includes(MARK)) || String(a.dueDate ?? '9').localeCompare(String(b.dueDate ?? '9')))
    return candidates[0] ?? null
  }

  const when = (x, L) => (x.dueDate ? `${x.dueDate}${x.dueTime ? ` ${x.dueTime}` : ''}` : L.noDate)

  /**
   * Stage 1, safe to run in parallel: everything that only reads.
   * @returns {Promise<{kind:'skip', what:string}|{kind:'mail', mail:object, items:object[], engine:string, fp:string, cacheable?:boolean}>}
   */
  async function prepare(env, acc, state, config, L, metrics, force) {
    const from = senderName(env.from)
    const fromAddr = addresses(env.from).join(' ') || from.toLowerCase()
    const matches = (list) => list.some((p) => fromAddr.includes(p) || from.toLowerCase().includes(p))
    const always = matches(config.alwaysSenders)
    if (!force && (matches(config.ignoreSenders) || matches(state.senders?.ignore ?? []))) return { kind: 'skip', what: 'ignored' }
    const noiseExtra = config.extraNoise ? safeRegex(config.extraNoise) : null
    if (!force && !always && isNoise({ subject: env.subject ?? '', from }, noiseExtra)) return { kind: 'skip', what: 'noise' }
    const read = await callTool('email_read', { uid: env.uid, ...(acc.name ? { account: acc.name } : {}) })
    const self = config.selfAddresses.length ? config.selfAddresses : acc.self
    const to = addresses(read?.to)
    const cc = addresses(read?.cc)
    const audience = self.length === 0 ? 'unknown' : to.some((a) => self.includes(a)) ? 'to' : cc.some((a) => self.includes(a)) ? 'cc' : 'unknown'
    const mail = {
      uid: env.uid,
      subject: read?.subject ?? env.subject ?? '',
      from: senderName(read?.from ?? env.from),
      fromAddr: addresses(read?.from ?? env.from)[0] ?? '',
      date: read?.date ?? env.date ?? '',
      body: typeof read?.text === 'string' ? read.text : '',
      attachments: Array.isArray(read?.attachments) ? read.attachments : [],
      audience: always || force ? (audience === 'cc' ? 'unknown' : audience) : audience,
      always: always || force,
      account: acc.name,
    }
    const res = await extract(mail, acc, state, config, L, metrics)
    let items = res.items
    // 「还是建一条」：模型和规则都说不用管时，按主题建一条无日期待办。
    if (force && items.length === 0) {
      const title = String(mail.subject).replace(/^((re|fw|fwd|回复|转发)\s*[:：]\s*)+/i, '').trim().slice(0, 60) || mail.from || L.unknownSender
      items = [{ key: '', kind: 'task', change: 'new', title, dueDate: '', dueTime: '', durationMinutes: 0, location: '', priority: 'medium', prep: '', quote: '' }]
    }
    return { kind: 'mail', mail, items, engine: res.engine, fp: res.fp, cacheable: res.cacheable }
  }

  /** Stage 2, strictly in mail order: dedupe, follow-ups, create, calendar, bookkeeping. */
  async function commit(prep, env, box, acc, state, todos, report, config, L) {
    const now = clock().toISOString()
    const label = report.multi && acc.name ? `[${acc.name}] ` : ''
    const entry = { at: now, account: acc.name ?? null, uid: env.uid, subject: String(prep.mail?.subject ?? env.subject ?? '').slice(0, 120), from: prep.mail?.from ?? senderName(env.from), fromAddr: prep.mail?.fromAddr ?? addresses(env.from)[0] ?? '' }
    if (prep.kind === 'skip') {
      box.seen[env.uid] = { at: now, skip: prep.what }
      if (prep.what === 'noise') report.noise += 1
      else report.ignored += 1
      decide(report, label + (env.subject ?? ''), prep.what)
      pushLog(state, { ...entry, what: prep.what })
      return
    }
    const { mail, items, engine } = prep
    report.processed += 1
    if (prep.cacheable) state.cache[prep.fp] = { at: now, engine, items }
    const created = []
    const outcome = []
    if (items.length === 0) decide(report, label + mail.subject, mail.audience === 'cc' && config.skipCcOnly ? 'cc' : 'none')
    for (const item of items) {
      // ---- follow-ups: move or close what an earlier mail created ----
      if (config.followUps && (item.change === 'reschedule' || item.change === 'cancel')) {
        const target = followUpTarget(item, todos, state)
        if (target && item.change === 'cancel') {
          const note = `${target.note ?? ''}\n${L.cancelledNote(String(mail.subject).slice(0, 60))}`.trim()
          const title = /^❌/.test(target.title) ? target.title : L.cancelledTitle(target.title.replace(/^⚠️\s*/, '')).slice(0, 200)
          await callTool('personal_todo', { action: 'update', id: target.id, title, note })
          await callTool('personal_todo', { action: 'complete', id: target.id, done: true }).catch(() => {})
          await syncCalendar(target.id, item, state, config, report, true)
          Object.assign(target, { title, note, done: true })
          report.cancelled += 1
          report.updated.push(title)
          outcome.push(['cancelled', target.title])
          if (item.key) state.keys[item.key] = { id: target.id, at: now }
          continue
        }
        if (target && item.change === 'reschedule' && item.dueDate) {
          if (target.dueDate === item.dueDate && (target.dueTime ?? '') === (item.dueTime ?? '')) { report.duplicates += 1; outcome.push(['dup', target.title]); continue }
          const moved = L.moved(when(target, L), when(item, L), String(mail.subject).slice(0, 60))
          const patch = { dueDate: item.dueDate, dueTime: item.dueTime || null, note: `${target.note ?? ''}\n${moved}`.trim() }
          await callTool('personal_todo', { action: 'update', id: target.id, ...patch })
          Object.assign(target, patch)
          await syncCalendar(target.id, item, state, config, report, false)
          if (!state.events[target.id]) await mirrorToCalendar({ ...item, title: target.title }, mail, target.id, state, config, report)
          report.moved += 1
          report.updated.push(`${target.title} → ${when(item, L)}`)
          outcome.push(['moved', target.title])
          if (item.key) state.keys[item.key] = { id: target.id, at: now }
          continue
        }
        if (item.change === 'cancel') { outcome.push(['none', item.title]); continue } // 没有可取消的原条目
      }
      if (item.change === 'cancel') { outcome.push(['none', item.title]); continue }
      // ---- ordinary dedupe ----
      if (item.key && state.keys[item.key] && todos.some((x) => x.id === state.keys[item.key].id)) { report.duplicates += 1; outcome.push(['dup', item.title]); continue }
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
    const top = outcome.find(([k]) => k !== 'dup' && k !== 'none')?.[0] ?? (outcome.length ? outcome[0][0] : (mail.audience === 'cc' && config.skipCcOnly ? 'cc' : 'none'))
    pushLog(state, { ...entry, what: top, engine, items: outcome.map(([k, title]) => ({ what: k, title })) })
  }

  /** Run `fn` over `list` with at most `limit` in flight. `results[i]` exists up front and settles in any order. */
  function pool(list, limit, fn) {
    const slots = list.map(() => {
      const slot = {}
      slot.promise = new Promise((resolve, reject) => { slot.resolve = resolve; slot.reject = reject })
      slot.promise.catch(() => {})
      return slot
    })
    let next = 0
    const workers = Array.from({ length: Math.max(1, Math.min(limit, list.length)) }, async () => {
      while (next < list.length) {
        const i = next++
        try { slots[i].resolve(await fn(list[i], i)) } catch (error) { slots[i].reject(error) }
      }
    })
    return { results: slots.map((s) => s.promise), done: Promise.all(workers) }
  }

  async function runOnce({ reason = 'poll' } = {}) {
    if (running) return running
    running = (async () => {
      const config = getConfig()
      const L = t(config.language)
      const startedAt = clock()
      const t0 = Date.now()
      const metrics = { llmCalls: 0, llmMs: 0, cacheHits: 0, invites: 0, errors: [] }
      const report = { reason, at: startedAt.toISOString(), scanned: 0, processed: 0, noise: 0, ignored: 0, duplicates: 0, moved: 0, cancelled: 0, llmCalls: 0, calendar: 0, created: [], updated: [], decisions: [], notices: [], errors: metrics.errors, ok: true }
      const state = await store.load()
      state.events ??= {}
      state.cache ??= {}
      state.log ??= []
      state.senders ??= { ignore: [] }
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
          box.force ??= []
          const label = report.multi ? `[${key}] ` : ''
          try {
            const { picked, maxUid, reset } = await newEnvelopes(box, acc.name, startedAt, config)
            if (reset) report.notices.push(label + L.rebaseline)
            // 被 rescan 的旧邮件可能不在第一页：直接按 uid 读。
            for (const uid of box.forced) if (!picked.some((m) => m.uid === uid)) picked.push({ uid, subject: '', from: '' })
            report.scanned += picked.length
            if (picked.length && todos === null) todos = await knownTodos()
            // 读信和模型调用并行，写待办严格按邮件顺序：判重和冲突检测看到的永远是前面已经写进去的。
            const forceSet = new Set(box.force)
            let stop = false
            const { results, done } = pool(picked, config.concurrency, (env) => (stop ? { kind: 'halted' } : prepare(env, acc, state, config, L, metrics, forceSet.has(env.uid))))
            for (let i = 0; i < picked.length; i += 1) {
              const env = picked[i]
              try {
                const prep = await results[i]
                if (prep.kind === 'halted') break
                await commit(prep, env, box, acc, state, todos, report, config, L)
              } catch (error) {
                report.errors.push(`${label}uid ${env.uid}: ${error instanceof Error ? error.message : String(error)}`)
                if (config.engine === 'llm') { stop = true; break } // 严格模式：不推进水位，下次重试
                box.seen[env.uid] = { at: clock().toISOString(), error: true }
                pushLog(state, { at: clock().toISOString(), account: acc.name ?? null, uid: env.uid, subject: String(env.subject ?? '').slice(0, 120), from: senderName(env.from), what: 'error' })
              }
              if (typeof env.uid === 'number') box.lastUid = Math.max(box.lastUid ?? 0, env.uid)
              await store.save(state) // 一封一落盘：中途退出也不会重复处理
            }
            await done
            box.forced = box.forced.filter((u) => !box.seen[u])
            box.force = box.force.filter((u) => !box.seen[u])
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
      Object.assign(report, { llmCalls: metrics.llmCalls, cacheHits: metrics.cacheHits, invites: metrics.invites, llmMs: metrics.llmMs })
      state.keys = trimMap(state.keys, KEY_CAP)
      state.events = trimMap(state.events, KEY_CAP)
      state.cache = trimMap(state.cache, CACHE_CAP)
      const ms = Date.now() - t0
      state.stats = addStats(state.stats, report, ms)
      state.lastRun = { ...report, errors: report.errors.slice(0, 10), ms }
      await store.save(state)
      if (report.created.length) log.info?.(`[inbox-planner] +${report.created.length}: ${report.created.join('; ')}`)
      if (!report.ok) log.warn?.(`[inbox-planner] ${report.errors.join('; ')}`)
      return state.lastRun
    })()
    try { return await running } finally { running = null }
  }

  /** Forget one mail so the next run reads it again (does not delete todos it made). */
  async function rescan(uid, account, { force = false } = {}) {
    if (running) await running.catch(() => {})
    const state = await store.load()
    const key = account || Object.keys(state.accounts)[0] || DEFAULT_KEY
    const box = (state.accounts[key] ??= emptyBox())
    delete box.seen[uid]
    box.forced = [...new Set([...(box.forced ?? []), uid])] // 只放行这一封，水位和基线不动
    if (force) box.force = [...new Set([...(box.force ?? []), uid])]
    // 强制重看时不要拿缓存里「不用处理」的旧结论顶替。
    if (force) state.cache = {}
    await store.save(state)
    return runOnce({ reason: `rescan ${account ? `${account}/` : ''}${uid}${force ? ' (force)' : ''}` })
  }

  /** Recent decisions, newest first. */
  async function activity({ limit = 50 } = {}) {
    const state = await store.load()
    const log = Array.isArray(state.log) ? state.log : []
    return { items: log.slice(-Math.max(1, Math.min(limit, LOG_CAP))).reverse(), ignored: state.senders?.ignore ?? [], stats: state.stats ?? null }
  }

  /** Add or remove a sender pattern from the planner's own ignore list. */
  async function setSender(pattern, ignore) {
    const p = String(pattern ?? '').trim().toLowerCase().replace(/^@/, '')
    if (p.length < 3) throw new Error('sender pattern too short')
    const state = await store.load()
    state.senders ??= { ignore: [] }
    const set = new Set(state.senders.ignore ?? [])
    if (ignore) set.add(p)
    else set.delete(p)
    state.senders.ignore = [...set].slice(-200)
    await store.save(state)
    return { ignored: state.senders.ignore }
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
      stats: state.stats ?? null,
      model: r ? `${r.provider}/${r.model}` : null,
    }
  }

  async function setPaused(paused) {
    const state = await store.load()
    state.paused = Boolean(paused)
    await store.save(state)
    return { paused: state.paused }
  }

  return { runOnce, rescan, status, setPaused, activity, setSender, isPaused: async () => (await store.load()).paused }
}

/** Should this item also become a calendar event? */
export function wantsCalendar(item, config) {
  if (!item.dueDate || config.calendar === 'off') return false
  if (config.calendar === 'all') return true
  return item.kind === 'event' && Boolean(item.dueTime)
}

/** Cumulative counters across runs (shown in status). */
function addStats(prev, r, ms) {
  const s = prev && typeof prev === 'object' ? { ...prev } : { runs: 0, mails: 0, created: 0, moved: 0, cancelled: 0, llmCalls: 0, llmMs: 0, cacheHits: 0, invites: 0, since: r.at }
  s.runs += 1
  s.mails += r.processed + r.noise + (r.ignored ?? 0)
  s.created += r.created.length
  s.moved += r.moved ?? 0
  s.cancelled += r.cancelled ?? 0
  s.llmCalls += r.llmCalls ?? 0
  s.llmMs += r.llmMs ?? 0
  s.cacheHits += r.cacheHits ?? 0
  s.invites += r.invites ?? 0
  s.lastMs = ms
  return s
}

function pushLog(state, entry) {
  state.log ??= []
  state.log.push(entry)
  if (state.log.length > LOG_CAP) state.log.splice(0, state.log.length - LOG_CAP)
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
