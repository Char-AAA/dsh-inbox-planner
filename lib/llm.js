/** One mail → one model call → strict JSON, repaired field by field. */

import { normDate, normTime, dayKey } from './rules.js'

const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const SYSTEM_PROMPT = `You are the recipient's personal scheduling assistant. Read ONE email and decide whether it asks the recipient personally to do something, or to be somewhere, at or before some time. Turn each such thing into a to-do.

Output exactly one JSON object and nothing else (no prose, no markdown fences):
{"v":1,"actionable":true|false,"items":[{"key":"stable-slug","kind":"event|task","change":"new|reschedule|cancel","title":"…","dueDate":"YYYY-MM-DD or empty","dueTime":"HH:mm or empty","durationMinutes":0,"location":"…","priority":"high|medium|low","prep":"…","quote":"…"}]}

What counts:
- Actions the recipient must take: reply, confirm attendance, submit/upload/re-submit, sign, pay/renew, review/approve, register, prepare, set up a device, complete an online test or assessment.
- Events the recipient must attend: meetings, interviews, exams, appointments, check-ups, calls.
What does NOT count: receipts and confirmations of something already done, newsletters, marketing, recommendations, surveys, security/verification codes, pure FYI, other people's tasks, anything that is already in the past.
If the mail says the recipient is only on CC, create items only when the mail explicitly names the recipient for an action.
Follow-ups DO count: a mail that moves or cancels something announced earlier (an interview moved to Friday, an exam postponed, a meeting cancelled) must produce an item for it.

Rules:
- One mail may hold several actions at different times (e.g. "confirm by Nov 13 18:00" and "exam on Nov 14 09:00"): output them as separate items, at most {maxItems}. Fewer good items beat many weak ones.
- kind: "event" when the recipient must BE somewhere or online at a set start time (exam, interview, meeting, call, appointment, scheduled device check) — these belong on a calendar; "task" when something must be DONE by a deadline or whenever (reply, confirm, submit, pay, complete an assessment within a window) — these belong on a to-do list.
- title: "<Organisation or person>: <action>", written in {titleLang}, ≤ 40 characters. Examples: "中国电信：线上笔试·计算机类", "Acme: submit Q3 expense report", "Dr Lee: dental check-up".
- change: "new" for a fresh request; "reschedule" when the mail changes the date or time of something announced earlier (give the NEW date and time); "cancel" when the mail calls something off (dueDate = the original date if stated, else empty). Use the same title and key the original announcement would have had.
- dueDate / dueTime: for events the START time, for actions the DEADLINE. Convert every time to the recipient's local time zone ({tz}). If only month and day are given, use the current year (next year if that date has already passed by more than two months). If the mail gives no date, leave both empty — never invent one.
- durationMinutes: event length if the mail states or clearly implies it (e.g. 09:00–11:00 → 120), else 0.
- location: physical address or "online" if stated, else empty. ≤ 60 characters.
- priority: high if missing it loses an opportunity, money, or a hard deadline; low if optional; otherwise medium.
- prep: concrete preparation the mail asks for (install a client, log in N minutes early, bring ID, second camera…), else empty. ≤ 60 characters, written in {noteLang}.
- quote: the source phrase from the email supporting this item, ≤ 60 characters.
- key: lowercase ASCII letters, digits and hyphens describing the task (e.g. acme-q3-expense-report). The same task must always get the same key.
- If nothing needs action: {"v":1,"actionable":false,"items":[]}.`

function clip(value, max) {
  if (typeof value !== 'string') return ''
  const s = value.replace(/\s+/g, ' ').trim()
  return s.length > max ? s.slice(0, max) : s
}

function slug(value) {
  return clip(value, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)
}

/** Strip quoted replies, signatures and links so the body budget goes to the new content. */
export function cleanBody(body) {
  // 引用回复、签名和链接只占预算；中英文客户端的引用头都识别。
  const lines = String(body ?? '').split(/\r?\n/)
  const out = []
  for (const line of lines) {
    if (/^\s*>/.test(line)) continue
    if (/^-{2,}\s*(原始邮件|Original Message)/i.test(line) || /^在.{4,60}写道[:：]\s*$/.test(line) || /^On .{4,80}wrote:\s*$/.test(line)) break
    out.push(line)
  }
  return out.join('\n').replace(/https?:\/\/\S+/g, '[link]').replace(/[\u200b-\u200d\ufeff]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

const AUDIENCE = { to: 'addressed to the recipient directly', cc: 'recipient is only on CC', unknown: 'unknown' }

export function buildPrompt(mail, { now, maxChars }) {
  const body = cleanBody(mail.body)
  const clipped = body.length > maxChars ? `${body.slice(0, maxChars)}\n…(truncated)` : body
  const names = (mail.attachments ?? []).map((a) => a?.filename).filter(Boolean).slice(0, 10)
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return [
    `Now: ${dayKey(now)} ${WEEK[now.getDay()]} ${hh}:${mm} (recipient's local time)`,
    `From: ${mail.from || '(unknown)'}`,
    `Sent: ${mail.date || '(unknown)'}`,
    `Subject: ${mail.subject || '(no subject)'}`,
    `Recipient: ${AUDIENCE[mail.audience] ?? AUDIENCE.unknown}`,
    `Attachments: ${names.length ? names.join(', ') : 'none'}`,
    'Body:',
    clipped || '(empty)',
  ].join('\n')
}

/** Find the JSON object in a reply that may carry thinking or fences around it. */
function pickObject(text) {
  const t = String(text ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/g, '')
  for (let start = t.lastIndexOf('{"v"'); start >= 0; start = t.lastIndexOf('{"v"', start - 1)) {
    let depth = 0
    let inStr = false
    for (let i = start; i < t.length; i += 1) {
      const c = t[i]
      if (inStr) { if (c === '\\') i += 1; else if (c === '"') inStr = false; continue }
      if (c === '"') inStr = true
      else if (c === '{') depth += 1
      else if (c === '}' && --depth === 0) {
        try { return JSON.parse(t.slice(start, i + 1)) } catch { break }
      }
    }
    if (start === 0) break
  }
  const a = t.indexOf('{')
  const b = t.lastIndexOf('}')
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)) } catch { /* fallthrough */ } }
  return null
}

/** Validate and repair one reply. @returns {{ok:true, items:object[]} | {ok:false, reason:string}} */
const CJK = /[\u3400-\u9fff]/g

/** Does a title read as the target language? (zh: has Chinese; en: at most a stray proper name in Chinese.) */
export function titleInLanguage(title, lang) {
  const cjk = (String(title).match(CJK) ?? []).length
  if (lang === 'zh') return cjk > 0
  if (lang === 'en') return cjk <= 4 && cjk / Math.max(1, String(title).replace(/\s/g, '').length) < 0.3
  return true
}

export function readReply(text, { now, maxItems, titleLang = null }) {
  const obj = pickObject(text)
  if (obj === null || typeof obj !== 'object') return { ok: false, reason: 'reply is not JSON' }
  if (!Array.isArray(obj.items)) return { ok: false, reason: 'missing items array' }
  const today = dayKey(now)
  const items = []
  const keys = new Set()
  for (const raw of obj.items) {
    if (!raw || typeof raw !== 'object') continue
    const title = clip(raw.title, 60)
    if (title.length < 2) continue
    const change = raw.change === 'reschedule' || raw.change === 'cancel' ? raw.change : 'new'
    const dueDate = normDate(raw.dueDate ?? '', now)
    // 已经过去的事不进清单；但「取消」可能指向原来的日期，照收。
    if (dueDate !== '' && dueDate < today && change !== 'cancel') continue
    const key = slug(raw.key) || ''
    if (key !== '' && keys.has(key)) continue
    if (key !== '') keys.add(key)
    items.push({
      key,
      kind: raw.kind === 'event' || raw.kind === 'task' ? raw.kind : (dueDate !== '' && normTime(raw.dueTime ?? '') !== '' ? 'event' : 'task'),
      change: change === 'reschedule' && dueDate === '' ? 'new' : change,
      title,
      dueDate,
      dueTime: dueDate === '' ? '' : normTime(raw.dueTime ?? ''),
      durationMinutes: Number.isInteger(raw.durationMinutes) && raw.durationMinutes > 0 && raw.durationMinutes <= 1440 ? raw.durationMinutes : 0,
      location: clip(raw.location, 60),
      priority: ['high', 'medium', 'low'].includes(raw.priority) ? raw.priority : 'medium',
      prep: clip(raw.prep, 80),
      quote: clip(raw.quote, 80),
    })
    if (items.length >= maxItems) break
  }
  if (titleLang) {
    const wrong = items.filter((i) => !titleInLanguage(i.title, titleLang))
    if (wrong.length) return { ok: false, reason: `titles must be written in ${titleLang === 'zh' ? 'Simplified Chinese' : 'English'} (got: ${wrong.map((i) => i.title).join(' | ')})`, items }
  }
  return { ok: true, items }
}

async function streamOnce(route, { system, prompt, maxTokens, timeoutMs }) {
  const options = {
    provider: route.provider,
    model: route.model,
    system,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    temperature: 0.1,
    maxTokens,
    signal: AbortSignal.timeout(timeoutMs),
  }
  if (route.reasoningEffort !== undefined) options.reasoningEffort = route.reasoningEffort
  let text = ''
  let truncated = false
  for await (const chunk of route.llm.stream(options)) {
    if (!chunk || typeof chunk !== 'object') continue
    if (chunk.type === 'text-delta') text += chunk.text
    else if (chunk.type === 'finish') {
      const kind = chunk.reason?.kind
      if (kind === 'max-tokens') truncated = true
      else if (kind === 'error' || kind === 'aborted') throw new Error(chunk.reason?.failure?.message ?? 'model call failed')
    }
  }
  return { text, truncated }
}

/** Ask the model about one mail; one repair retry, one doubled-budget retry. Never throws. */
export async function extractWithModel(route, mail, cfg, now = new Date()) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time'
  const named = cfg.language === 'zh' ? 'Simplified Chinese' : 'English'
  const system = SYSTEM_PROMPT.replace('{maxItems}', String(cfg.maxItemsPerMail)).replace('{tz}', tz)
    .replace('{titleLang}', cfg.titleLanguage === 'mail' ? 'the same language as the email' : `${named} — ALWAYS, even when the email is in another language: translate the whole title, organisation names included${cfg.language === 'zh' ? ' (Latin brand names such as UOB or Acme may stay as written)' : ' (e.g. 中国电信广东公司：完成校招综合测评 → China Telecom Guangdong: complete campus recruitment assessment)'}`)
    .replace('{noteLang}', named) +
    (cfg.promptExtra ? `\n\nAdditional instructions from the user:\n- ${cfg.promptExtra}` : '')
  const prompt = buildPrompt(mail, { now, maxChars: cfg.llmBodyChars })
  let maxTokens = cfg.llmMaxTokens
  let lastReason = ''
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let res
    try {
      const p = attempt > 0 && lastReason !== 'truncated' ? `${prompt}\n\nYour previous reply was unusable (${lastReason}). Output only the single JSON object.` : prompt
      res = await streamOnce(route, { system, prompt: p, maxTokens, timeoutMs: cfg.llmTimeoutMs })
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) }
    }
    if (res.truncated) { lastReason = 'truncated'; maxTokens = Math.min(maxTokens * 2, 16000); continue }
    const strict = cfg.titleLanguage !== 'mail' && attempt < 2 ? cfg.language : null
    const read = readReply(res.text, { now, maxItems: cfg.maxItemsPerMail, titleLang: strict })
    if (read.ok) return read
    // 最后一次还不对：语言问题不值得丢掉整封邮件，照收。
    if (attempt === 2 && read.items) return { ok: true, items: read.items }
    lastReason = read.reason
  }
  return { ok: false, reason: `unusable model reply: ${lastReason}` }
}

/** Resolve the model route the same way dsh-email-todo does. */
export function resolveRoute(ctx, cfg) {
  const llm = ctx.get?.('llm')
  if (!llm || typeof llm.stream !== 'function') return null
  const selector = ctx.get?.('agentDefaultModel')
  const sel = typeof selector?.currentSelection === 'function' ? selector.currentSelection() : undefined
  const provider = cfg.llmProvider || sel?.provider || ''
  const model = cfg.llmModel || sel?.model || ''
  if (!provider || !model) return null
  const overridden = Boolean(cfg.llmProvider || cfg.llmModel)
  return { llm, provider, model, reasoningEffort: overridden ? undefined : sel?.reasoningEffort }
}
