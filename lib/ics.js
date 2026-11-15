/** iCalendar in and out: read a meeting invitation (.ics), write to-dos as an .ics file. No dependencies. */

import { dayKey } from './rules.js'

/** Unfold RFC 5545 continuation lines and split into `{ name, params, value }`. */
export function parseLines(text) {
  const raw = String(text ?? '').replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n')
  const out = []
  for (const line of raw) {
    const colon = findValueColon(line)
    if (colon < 0) continue
    const head = line.slice(0, colon)
    const [name, ...paramParts] = head.split(';')
    const params = {}
    for (const p of paramParts) {
      const eq = p.indexOf('=')
      if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '')
    }
    out.push({ name: name.toUpperCase(), params, value: line.slice(colon + 1) })
  }
  return out
}

/** The colon that ends the property head (colons inside quoted params do not count). */
function findValueColon(line) {
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i]
    if (c === '"') quoted = !quoted
    else if (c === ':' && !quoted) return i
  }
  return -1
}

function unescapeText(v) {
  return String(v ?? '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').replace(/\s+/g, ' ').trim()
}

const pad = (n) => String(n).padStart(2, '0')

/** Offset (ms) of `timeZone` at the instant `utcMs`, via Intl. null if the zone is unknown. */
function zoneOffset(utcMs, timeZone) {
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]))
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second)
    return asUtc - utcMs
  } catch {
    return null
  }
}

/** Wall clock in `timeZone` → UTC ms (two passes settle DST edges). */
function zonedToUtc(y, mo, d, h, mi, timeZone) {
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  const off1 = zoneOffset(guess, timeZone)
  if (off1 === null) return null
  const off2 = zoneOffset(guess - off1, timeZone)
  return guess - (off2 ?? off1)
}

/** Windows zone names that Outlook writes in TZID. Only the common ones; unknown names fall back to floating time. */
const WINDOWS_TZ = {
  'China Standard Time': 'Asia/Shanghai', 'Taipei Standard Time': 'Asia/Taipei', 'Tokyo Standard Time': 'Asia/Tokyo',
  'Singapore Standard Time': 'Asia/Singapore', 'AUS Eastern Standard Time': 'Australia/Sydney', 'E. Australia Standard Time': 'Australia/Brisbane',
  'GMT Standard Time': 'Europe/London', 'W. Europe Standard Time': 'Europe/Berlin', 'Romance Standard Time': 'Europe/Paris',
  'Eastern Standard Time': 'America/New_York', 'Central Standard Time': 'America/Chicago', 'Mountain Standard Time': 'America/Denver',
  'Pacific Standard Time': 'America/Los_Angeles', 'India Standard Time': 'Asia/Kolkata', 'Korea Standard Time': 'Asia/Seoul', UTC: 'UTC',
}

/**
 * One DTSTART/DTEND value → `{ date, time }` in this machine's local time.
 * `20261114T090000Z` (UTC), `TZID=Asia/Shanghai:20261114T090000`, floating, or `VALUE=DATE:20261114`.
 */
export function icsTime(prop) {
  if (!prop) return null
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(String(prop.value).trim())
  if (!m) return null
  const [, y, mo, d, h, mi, , z] = m
  if (h === undefined) return { date: `${y}-${mo}-${d}`, time: '', allDay: true }
  let at
  if (z) at = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi))
  else {
    const zone = prop.params?.TZID ? (WINDOWS_TZ[prop.params.TZID] ?? prop.params.TZID) : null
    const utc = zone ? zonedToUtc(+y, +mo, +d, +h, +mi, zone) : null
    at = utc === null ? new Date(+y, +mo - 1, +d, +h, +mi) : new Date(utc)
  }
  if (Number.isNaN(at.getTime())) return null
  return { date: dayKey(at), time: `${pad(at.getHours())}:${pad(at.getMinutes())}`, allDay: false, at }
}

function cn(prop) {
  if (!prop) return ''
  if (prop.params?.CN) return unescapeText(prop.params.CN)
  return String(prop.value).replace(/^mailto:/i, '').trim()
}

/**
 * Meeting invitation → items the planner understands.
 * METHOD:CANCEL (or STATUS:CANCELLED) → change "cancel"; SEQUENCE > 0 → "reschedule".
 * @returns {{method:string, items:object[]}|null}
 */
export function parseInvite(text, now = new Date()) {
  const lines = parseLines(text)
  if (!lines.some((l) => l.name === 'BEGIN' && /^VEVENT$/i.test(l.value))) return null
  const method = (lines.find((l) => l.name === 'METHOD')?.value ?? 'PUBLISH').toUpperCase()
  const items = []
  let ev = null
  for (const l of lines) {
    if (l.name === 'BEGIN' && /^VEVENT$/i.test(l.value)) { ev = {}; continue }
    if (l.name === 'END' && /^VEVENT$/i.test(l.value)) {
      if (ev) items.push(ev)
      ev = null
      continue
    }
    if (ev && !(l.name in ev)) ev[l.name] = l
  }
  const today = dayKey(now)
  const out = []
  for (const e of items) {
    const start = icsTime(e.DTSTART)
    if (!start) continue
    const end = icsTime(e.DTEND)
    const cancelled = method === 'CANCEL' || /^CANCELLED$/i.test(e.STATUS?.value ?? '')
    if (!cancelled && start.date < today) continue
    const summary = unescapeText(e.SUMMARY?.value) || 'Meeting'
    const organizer = cn(e.ORGANIZER)
    const seq = Number.parseInt(e.SEQUENCE?.value ?? '0', 10) || 0
    const duration = start.at && end?.at ? Math.round((end.at - start.at) / 60000) : 0
    out.push({
      key: `ics-${String(e.UID?.value ?? summary).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)}`,
      kind: 'event',
      // An update to an invitation carries a higher SEQUENCE; with no earlier item it simply becomes new.
      change: cancelled ? 'cancel' : seq > 0 ? 'reschedule' : 'new',
      title: /[:：]/.test(summary) || !organizer ? summary.slice(0, 60) : `${organizer.replace(/@.*/, '')}: ${summary}`.slice(0, 60),
      dueDate: start.date,
      dueTime: start.time,
      durationMinutes: duration > 0 && duration <= 1440 ? duration : 0,
      location: unescapeText(e.LOCATION?.value).slice(0, 60),
      priority: 'high',
      prep: '',
      quote: unescapeText(e.DESCRIPTION?.value).slice(0, 80),
      source: 'ics',
    })
  }
  return { method, items: out }
}

/** Does this attachment look like a calendar invitation? */
export function isInviteAttachment(a) {
  return /\.ics$/i.test(String(a?.filename ?? '')) || /text\/calendar|application\/ics/i.test(String(a?.contentType ?? ''))
}

function escapeText(s) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
}

/** Fold to 75 octets per line (RFC 5545 §3.1), counting UTF-8 bytes. */
function fold(line) {
  const out = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const b = Buffer.byteLength(ch)
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0 }
    cur += ch
    bytes += b
  }
  out.push(cur)
  return out.join('\r\n ')
}

function utcStamp(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

/**
 * To-dos with a date → VCALENDAR text. Timed items become 1-hour events at their
 * local time (written as UTC so any calendar app places them right); date-only
 * items become all-day events.
 */
export function todosToIcs(todos, { now = new Date(), name = 'Inbox Planner', minutes = 60 } = {}) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//dsh-inbox-planner//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${escapeText(name)}`]
  for (const t of todos) {
    if (!t?.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)) continue
    const [y, mo, d] = t.dueDate.split('-').map(Number)
    lines.push('BEGIN:VEVENT', `UID:${escapeText(t.id ?? `${t.dueDate}-${t.title}`)}@dsh-inbox-planner`, `DTSTAMP:${utcStamp(now)}`)
    if (t.dueTime && /^\d{2}:\d{2}$/.test(t.dueTime)) {
      const [h, mi] = t.dueTime.split(':').map(Number)
      const start = new Date(y, mo - 1, d, h, mi)
      lines.push(`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(new Date(start.getTime() + minutes * 60000))}`)
    } else {
      const next = new Date(y, mo - 1, d + 1)
      lines.push(`DTSTART;VALUE=DATE:${t.dueDate.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`)
    }
    lines.push(`SUMMARY:${escapeText(t.title)}`)
    if (t.note) lines.push(`DESCRIPTION:${escapeText(String(t.note).replace(/\n?#inbox-planner.*$/m, '').trim())}`)
    if (t.priority === 'high') lines.push('PRIORITY:1')
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
