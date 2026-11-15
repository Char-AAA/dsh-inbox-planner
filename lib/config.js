/**
 * Single source of truth for configuration: defaults, ranges, the schemastery
 * `Config` DSH turns into the auto settings page, and the normalizer the host
 * half reads on every run (fields are volatile, so edits apply without restart).
 */

import z from '@deepseek-ai/schemastery'

/** Settings page sections, in display order. */
export const GROUPS = [
  { id: 'basic', zh: '基本', en: 'Basics' },
  { id: 'rules', zh: '判定规则', en: 'Rules' },
  { id: 'calendar', zh: '日历', en: 'Calendar' },
  { id: 'remind', zh: '提醒', en: 'Reminders' },
  { id: 'model', zh: '模型', en: 'Model' },
]

/** kind: number | boolean | string | text | select */
export const FIELDS = [
  { key: 'accounts', group: 'basic', labelZh: '处理哪些邮箱', labelEn: 'Mailboxes', kind: 'string', def: '', zh: 'dsh-email 里的账号名，逗号分隔；留空 = 全部邮箱', en: 'dsh-email account names, comma separated; empty = every mailbox' },
  { key: 'pollSeconds', group: 'basic', labelZh: '检查间隔（秒）', labelEn: 'Check interval (s)', kind: 'number', def: 60, min: 0, max: 86400, zh: '检查新邮件的间隔（秒），0 = 关闭自动检查', en: 'Seconds between inbox checks; 0 disables automatic checks' },
  { key: 'backfillDays', group: 'basic', labelZh: '首次回补天数', labelEn: 'First-run backfill (days)', kind: 'number', def: 3, min: 0, max: 30, zh: '首次启用时回补最近几天的邮件', en: 'Days of past mail to process on first run' },
  { key: 'category', group: 'basic', labelZh: '待办分类', labelEn: 'To-do category', kind: 'string', def: '', zh: '写入待办时的分类；留空 = 首次运行时按 DSH 界面语言定为「邮件」或「Mail」，之后固定不变', en: 'To-do category; empty = "邮件" or "Mail" chosen once from the DSH UI language on first run, then kept' },
  { key: 'language', group: 'basic', labelZh: '语言', labelEn: 'Language', kind: 'select', def: 'auto', options: ['auto', 'zh', 'en'], zh: '待办标题、备注、报告和本页的语言；auto = 跟随 DSH 界面语言（DSH 设为跟随系统时即系统语言）', en: 'Language of to-do titles, notes, reports and this page; auto = the DSH UI language (the OS language when DSH follows the system)' },
  { key: 'titleLanguage', group: 'basic', labelZh: '标题语言', labelEn: 'Title language', kind: 'select', def: 'system', options: ['system', 'mail'], zh: 'system = 待办标题统一用上面的语言；mail = 标题保留邮件原文语言', en: 'system = to-do titles use the language above; mail = keep each mail\'s own language' },
  { key: 'engine', group: 'model', labelZh: '引擎', labelEn: 'Engine', kind: 'select', def: 'auto', options: ['auto', 'llm', 'rules'], zh: 'auto = 用模型，失败退回规则；llm = 只用模型；rules = 不调模型', en: 'auto = model with rule fallback; llm = model only; rules = no model calls' },
  { key: 'llmProvider', group: 'model', labelZh: '模型提供方', labelEn: 'Model provider', kind: 'string', def: '', zh: '模型提供方，留空 = DSH 默认模型', en: 'Model provider; empty = DSH default model' },
  { key: 'llmModel', group: 'model', labelZh: '模型', labelEn: 'Model', kind: 'string', def: '', zh: '模型 id，留空 = DSH 默认模型', en: 'Model id; empty = DSH default model' },
  { key: 'maxItemsPerMail', group: 'rules', labelZh: '每封最多几条', labelEn: 'Max items per mail', kind: 'number', def: 3, min: 1, max: 8, zh: '每封邮件最多生成几条', en: 'Max to-dos per mail' },
  { key: 'skipCcOnly', group: 'rules', labelZh: '忽略仅抄送', labelEn: 'Ignore CC-only mail', kind: 'boolean', def: true, zh: '仅抄送给我的邮件默认不生成（除非信中点名要我做事）', en: 'Ignore mail where I am only on CC unless it names me for an action' },
  { key: 'selfAddresses', group: 'rules', labelZh: '我的邮箱地址', labelEn: 'My addresses', kind: 'string', def: '', zh: '我的邮箱地址（逗号分隔），留空 = 自动从 dsh-email 识别', en: 'My addresses, comma separated; empty = detect from dsh-email' },
  { key: 'conflictMinutes', group: 'rules', labelZh: '冲突判定（分钟）', labelEn: 'Clash window (min)', kind: 'number', def: 150, min: 0, max: 1440, zh: '同一天开始时间相差小于此分钟数视为冲突，0 = 不检测', en: 'Same-day items starting closer than this many minutes are flagged; 0 = off' },
  { key: 'annotateBoth', group: 'rules', labelZh: '冲突双向标注', labelEn: 'Annotate both items', kind: 'boolean', def: true, zh: '冲突时也在原有那条的备注里提示', en: 'Also annotate the existing item on a conflict' },
  { key: 'dedupeDays', group: 'rules', labelZh: '判重窗口（天）', labelEn: 'Dedupe window (days)', kind: 'number', def: 3, min: 0, max: 30, zh: '同机构同类事项，日期相差在几天内视为同一件', en: 'Same organisation + same kind within this many days counts as one task' },
  { key: 'calendar', group: 'calendar', labelZh: '写入日历', labelEn: 'Add to calendar', kind: 'select', def: 'events', options: ['events', 'all', 'off'], zh: 'events = 只把有具体时间、需要到场的事（考试、面试、会议、预约）写进 dsh-calendar；all = 有日期的都写；off = 不写。未安装或未连接 dsh-calendar 时自动跳过', en: 'events = only things you attend at a set time (exams, interviews, meetings, appointments) go to dsh-calendar; all = every dated item; off = never. Skipped automatically when dsh-calendar is not installed or connected' },
  { key: 'eventMinutes', group: 'calendar', labelZh: '默认事件时长（分钟）', labelEn: 'Default event length (min)', kind: 'number', def: 60, min: 5, max: 1440, zh: '日历事件默认时长（分钟），模型给出时以模型为准', en: 'Default calendar event length in minutes when the mail gives none' },
  { key: 'followUps', group: 'rules', labelZh: '跟进改期和取消', labelEn: 'Follow reschedules and cancellations', kind: 'boolean', def: true, zh: '后来的邮件说改期或取消时，更新或关闭原来那条待办（以及日历事件）', en: 'When a later mail moves or cancels something, update or close the existing to-do (and its calendar event)' },
  { key: 'invites', group: 'rules', labelZh: '读取会议邀请（.ics）', labelEn: 'Read calendar invitations (.ics)', kind: 'boolean', def: true, zh: '邮件带日历邀请附件时直接读取时间地点，不调用模型', en: 'Take time and place straight from an attached calendar invitation, without a model call' },
  { key: 'ignoreSenders', group: 'rules', labelZh: '忽略这些发件人', labelEn: 'Ignore senders', kind: 'string', def: '', zh: '地址或域名片段，逗号分隔；匹配的邮件直接跳过。处理记录里点「忽略此发件人」会加在这里之外的单独名单', en: 'Addresses or domain fragments, comma separated; matching mail is skipped. "Ignore sender" in the activity log keeps its own list in addition to this' },
  { key: 'alwaysSenders', group: 'rules', labelZh: '总是分析这些发件人', labelEn: 'Always analyse senders', kind: 'string', def: '', zh: '地址或域名片段，逗号分隔；这些发件人的邮件不会被当成噪音或仅抄送跳过', en: 'Addresses or domain fragments, comma separated; their mail is never dropped as noise or CC-only' },
  { key: 'promptExtra', group: 'model', labelZh: '追加给模型的要求', labelEn: 'Extra model instructions', kind: 'text', def: '', zh: '追加给模型的要求，例如「账单类一律低优先级」', en: 'Extra instructions for the model, e.g. "bills are always low priority"' },
  { key: 'extraNoise', group: 'rules', labelZh: '额外噪音规则（正则）', labelEn: 'Extra noise regex', kind: 'string', def: '', zh: '额外噪音正则：主题或发件人匹配即跳过，不调模型', en: 'Extra noise regex on subject/sender; matches are skipped without a model call' },
  { key: 'concurrency', group: 'model', labelZh: '并行分析数', labelEn: 'Parallel analyses', kind: 'number', def: 3, min: 1, max: 6, zh: '同时分析几封邮件（读取和模型调用并行，写入待办仍按顺序）', en: 'Mails analysed at once (reads and model calls run in parallel; to-dos are still written in order)' },
  { key: 'remindMinutes', group: 'remind', labelZh: '提前提醒（分钟）', labelEn: 'Remind before (min)', kind: 'number', def: 30, min: 0, max: 1440, zh: '有具体时间的待办提前多少分钟提醒，0 = 不提醒。提醒在 DSH 窗口打开时弹出', en: 'Minutes before a timed to-do to remind you; 0 = off. Reminders appear while a DSH window is open' },
  { key: 'briefTime', group: 'remind', labelZh: '每日简报时间', labelEn: 'Daily brief time', kind: 'string', def: '08:30', zh: 'HH:mm，到点汇总今天和逾期的待办；留空 = 不发', en: 'HH:mm; lists today\'s and overdue to-dos at this time; empty = off' },
  { key: 'quietHours', group: 'remind', labelZh: '免打扰时段', labelEn: 'Quiet hours', kind: 'string', def: '22:00-08:00', zh: 'HH:mm-HH:mm，这段时间不弹提醒，结束后补发；留空 = 不设', en: 'HH:mm-HH:mm; no reminders during this window, held ones arrive when it ends; empty = none' },
  { key: 'remindStyle', group: 'remind', labelZh: '提醒方式', labelEn: 'How to remind', kind: 'select', def: 'dot', options: ['dot', 'popup'], zh: 'dot = 只在左侧「待办」图标右上角亮红点，打开待办后消失；popup = 窗口右下角弹提示条，并发系统通知', en: 'dot = only a red dot on the To-do icon in the sidebar, cleared when you open To-do; popup = a banner in the window corner plus a system notification' },
  { key: 'llmBodyChars', group: 'model', labelZh: '正文最大字符数', labelEn: 'Max body characters', kind: 'number', def: 2500, min: 300, max: 12000, zh: '交给模型的正文最大字符数', en: 'Max body characters sent to the model' },
  { key: 'llmMaxTokens', group: 'model', labelZh: '单次输出上限', labelEn: 'Max output tokens', kind: 'number', def: 3000, min: 300, max: 16000, zh: '单次模型输出上限', en: 'Max output tokens per model call' },
  { key: 'llmTimeoutMs', group: 'model', labelZh: '调用超时（毫秒）', labelEn: 'Call timeout (ms)', kind: 'number', def: 180000, min: 10000, max: 600000, zh: '单次模型调用超时（毫秒）', en: 'Model call timeout (ms)' },
]

function field(f) {
  const desc = `${f.zh} / ${f.en}`
  let s
  if (f.kind === 'number') s = z.number().min(f.min).max(f.max)
  else if (f.kind === 'boolean') s = z.boolean()
  else if (f.kind === 'select') s = z.union(f.options)
  else if (f.kind === 'text') s = z.string().role('textarea')
  else s = z.string()
  return s.default(f.def).description(desc).volatile()
}

export const Config = z.object(Object.fromEntries(FIELDS.map((f) => [f.key, field(f)])))

export const DEFAULTS = Object.fromEntries(FIELDS.map((f) => [f.key, f.def]))

/** Unwrap a volatile reference (an object with `.get()`), or return the value. */
function unwrap(v) {
  return v !== null && typeof v === 'object' && typeof v.get === 'function' ? v.get() : v
}

/** Raw (possibly volatile) config → plain, clamped object. Never throws. `locale` = DSH UI preference if known. */
export function normalizeConfig(raw, { locale } = {}) {
  const out = {}
  for (const f of FIELDS) {
    let v
    try { v = raw && typeof raw === 'object' ? unwrap(raw[f.key]) : undefined } catch { v = undefined }
    if (f.kind === 'number') {
      const n = typeof v === 'number' ? v : Number.parseFloat(String(v ?? ''))
      out[f.key] = Number.isFinite(n) ? Math.min(f.max, Math.max(f.min, Math.round(n))) : f.def
    } else if (f.kind === 'boolean') {
      out[f.key] = typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : f.def
    } else if (f.kind === 'select') {
      out[f.key] = f.options.includes(v) ? v : f.def
    } else {
      out[f.key] = typeof v === 'string' ? v.trim() : f.def
    }
  }
  if (out.language === 'auto') out.language = detectLanguage({ locale })
  // 分类留空时不在这里定死：planner 第一次运行时按当时的语言选一次并存进状态文件，
  // 之后语言判定变了也不会让新旧条目分成两类。
  out.category = out.category.slice(0, 24)
  out.categoryDefault = out.language === 'zh' ? '邮件' : 'Mail'
  out.accounts = out.accounts.split(/[,，;；\s]+/).map((x) => x.trim()).filter(Boolean)
  out.selfAddresses = out.selfAddresses.split(/[\s,;，；]+/).map((s) => s.toLowerCase()).filter((s) => s.includes('@'))
  const senders = (v) => v.split(/[\s,;，；]+/).map((s) => s.toLowerCase().replace(/^@/, '')).filter((s) => s.length >= 3)
  out.ignoreSenders = senders(out.ignoreSenders)
  out.alwaysSenders = senders(out.alwaysSenders)
  out.briefTime = /^([01]?\d|2[0-3]):[0-5]\d$/.test(out.briefTime) ? out.briefTime.padStart(5, '0') : ''
  out.quietHours = /^([01]?\d|2[0-3]):[0-5]\d\s*[-–~]\s*([01]?\d|2[0-3]):[0-5]\d$/.test(out.quietHours) ? out.quietHours.replace(/\s/g, '').replace(/[–~]/, '-') : ''
  return out
}

/**
 * DSH's own UI language wins: in the desktop app the host process has no LANG and
 * Intl follows the OS, which can differ from the language the user chose in DSH.
 */
export function detectLanguage({ locale, env = process.env } = {}) {
  // DSH 的语言偏好可能是「跟随系统」：这时不当作语言标签，往下落到系统语言。
  if (typeof locale === 'string' && /^(system|auto|os|default)$/i.test(locale)) locale = undefined
  const tag = String(locale || env.DSH_LOCALE || env.LC_ALL || env.LC_MESSAGES || env.LANG || Intl.DateTimeFormat().resolvedOptions().locale || '')
  return /^zh/i.test(tag) ? 'zh' : 'en'
}

/** The UI language the user picked in DSH (same lookup as dsh-email), or undefined. */
export function readDshLocale(ctx) {
  try {
    const settings = ctx?.settings ?? ctx?.get?.('settings')
    const row = settings?.describe?.().find((r) => r?.ns === 'locale')
    const pref = row?.user?.preference || row?.base?.preference
    return typeof pref === 'string' && pref !== '' ? pref : undefined
  } catch {
    return undefined
  }
}
