/** Zero-token pieces: noise filter, rule extraction, dates, similarity. */

const NOISE = /验证码|安全代码|激活码|登录提醒|登录通知|新设备登录|投递成功|感谢.{0,6}投递|简历.{0,4}已(收到|投递)|已收到您的(简历|申请)|退订|订阅|促销|优惠券?|广告|营销|问卷|调研邀请|岗位推荐|职位推荐|为你推荐|猜你喜欢|电子回单|security code|verification code|one[- ]time (pass)?code|sign[- ]in (alert|attempt)|new login|unsubscribe|newsletter|digest|promotion|% off|sale ends|thanks for applying|application received|recommended (jobs|for you)|survey/i
const ACTION = /笔试|面试|测评|考试|测试邀请|在线测|确认参加|请于|请在|截止|到期|报名|签约|三方|材料|补交|重交|回复确认|请回复|缴费|付款|续费|入职|体检|会议邀请|开会|审批|签署|offer|interview|assessment|online test|deadline|due (on|by|date)|RSVP|please (reply|confirm|submit|sign|review|complete)|action required|invitation:|meeting|payment due|renew/i

const CANCEL = /取消|撤销|作废|不再举行|cancel+ed|cancellation|called off|withdrawn/i
const RESCHEDULE = /改期|延期|推迟|提前至|改至|改到|调至|延至|调整(为|至|到)|改为|变更(为|至)|时间(调整|变更)|reschedul|postponed|moved to|new time|updated invitation/i
// 正文里指向「新时间」的措辞。
const NEW_TIME = /改至|改到|调至|延至|推迟至|推迟到|提前至|提前到|调整(为|至|到)|改为|变更(为|至)|moved to|rescheduled (to|for)|postponed (to|until)|new time/i

/** "new" / "reschedule" / "cancel" from wording alone (rule engine and pre-check). */
export function changeOf(text) {
  const s = String(text ?? '')
  if (CANCEL.test(s)) return 'cancel'
  if (RESCHEDULE.test(s)) return 'reschedule'
  return 'new'
}

/** True when a mail can be dropped from its envelope alone. */
export function isNoise({ subject = '', from = '' }, extra = null) {
  const head = `${subject} ${from}`
  if (extra instanceof RegExp && extra.test(head)) return true
  if (ACTION.test(subject) || CANCEL.test(subject) || RESCHEDULE.test(subject)) return false
  return NOISE.test(head)
}

const pad = (n) => String(n).padStart(2, '0')

/** Local `YYYY-MM-DD`. */
export function dayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function validDay(y, m, d) {
  const at = new Date(y, m - 1, d)
  return at.getFullYear() === y && at.getMonth() === m - 1 && at.getDate() === d ? dayKey(at) : null
}

/** Salvage a model/rule date into YYYY-MM-DD (local), or ''. */
export function normDate(value, now = new Date()) {
  if (typeof value !== 'string') return ''
  const s = value.trim()
  let m = /(\d{4})\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})/.exec(s)
  if (m) return validDay(+m[1], +m[2], +m[3]) ?? ''
  m = /(?:^|\D)(\d{1,2})\s*[-/月.]\s*(\d{1,2})\s*(?:日|号)?/.exec(s)
  if (m) {
    // 只给月日：取不早于两个月前的那一年（12 月收到 1 月的通知 → 明年）。
    let y = now.getFullYear()
    const cand = validDay(y, +m[1], +m[2])
    if (cand && cand < dayKey(new Date(now.getTime() - 60 * 86400000))) y += 1
    return validDay(y, +m[1], +m[2]) ?? ''
  }
  return ''
}

/** Salvage a time into HH:mm, or ''. Handles 下午3点 / 3:30 PM / 15：00. */
export function normTime(value) {
  if (typeof value !== 'string') return ''
  const s = value.trim()
  let m = /(\d{1,2})\s*[:：]\s*(\d{2})\s*(am|pm)?/i.exec(s)
  let h, min
  if (m) { h = +m[1]; min = +m[2]; if (m[3]) { const pm = /pm/i.test(m[3]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0 } }
  else if ((m = /(\d{1,2})\s*点\s*(半|(\d{1,2})\s*分?)?/.exec(s))) { h = +m[1]; min = m[2] === '半' ? 30 : m[3] ? +m[3] : 0 }
  else return ''
  if (/下午|晚上|傍晚/.test(s) && h < 12) h += 12
  if (h > 23 || min > 59) return ''
  return `${pad(h)}:${pad(min)}`
}

/** Rule engine: subject + body → at most one item. Used when no model is available or the model fails. */
export function ruleExtract(mail, now = new Date()) {
  const subject = String(mail.subject ?? '').trim()
  const body = String(mail.body ?? '')
  if (!ACTION.test(`${subject}\n${body.slice(0, 1500)}`)) return []
  const change = changeOf(subject)
  const today = dayKey(now)
  const text = `${subject}\n${body.slice(0, 4000)}`
  const re = /((?:\d{4}\s*[年\-/.]\s*)?\d{1,2}\s*[月\-/.]\s*\d{1,2}\s*[日号]?)[^\n\d]{0,12}?(?:(上午|下午|晚上)?\s*(\d{1,2}\s*[:：]\s*\d{2}|\d{1,2}\s*点半?))?/g
  let dueDate = ''
  let dueTime = ''
  // 改期邮件常是「原定 18 日……改至 20 日」：取改期措辞之后的第一个日期。
  const bodyAt = subject.length + 1
  const hint = change === 'reschedule' ? text.slice(bodyAt).search(NEW_TIME) : -1
  const pivot = hint >= 0 ? bodyAt + hint : 0
  for (const m of text.matchAll(re)) {
    if (m.index < pivot) continue
    const d = normDate(m[1], now)
    if (d === '' || d < today) continue
    dueDate = d
    dueTime = m[3] ? normTime(`${m[2] ?? ''}${m[3]}`) : ''
    break
  }
  const title = subject.replace(/^(re|fw|fwd|回复|转发)\s*[:：]\s*/i, '').slice(0, 60) || '处理邮件'
  const kind = dueTime !== '' && /笔试|面试|考试|会议|开会|宣讲|体检|预约|interview|exam|meeting|appointment|webinar|call/i.test(`${subject}\n${body.slice(0, 600)}`) ? 'event' : 'task'
  const clean = title.replace(/[（(【\[]?\s*(已取消|取消|改期|延期|cancel+ed|rescheduled|postponed)\s*[)）】\]]?\s*[:：-]?\s*/gi, '').trim() || title
  return [{ key: '', kind, change: change === 'reschedule' && dueDate === '' ? 'new' : change, title: clean, dueDate, dueTime, priority: dueDate !== '' ? 'high' : 'medium', prep: '', quote: '' }]
}

/** Character-bigram Jaccard similarity, robust for short CJK titles. */
export function similarity(a, b) {
  const grams = (s) => {
    const t = String(s).toLowerCase().replace(/[\s:：·，,。.!！?？()（）【】\[\]「」"'-]/g, '')
    const out = new Set()
    for (let i = 0; i < t.length - 1; i += 1) out.add(t.slice(i, i + 2))
    if (t.length === 1) out.add(t)
    return out
  }
  const x = grams(a)
  const y = grams(b)
  if (x.size === 0 || y.size === 0) return 0
  let inter = 0
  for (const g of x) if (y.has(g)) inter += 1
  return inter / (x.size + y.size - inter)
}

/** Minutes between two HH:mm, or null. */
export function minutesApart(a, b) {
  if (!a || !b) return null
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  return Math.abs(toMin(a) - toMin(b))
}

/** Kind groups: synonyms map to one id so "重交材料" and "重新提交材料" match. */
// 顺序有意义：先认"动作"（确认、设备调试、签约、交材料……），再认"事件"（笔试、面试……），
// 这样「确认参加笔试」和「笔试」是两件事。
const KINDS = [
  ['confirm', /确认参加|确认出席|回执|confirm|rsvp/i],
  ['setup', /设备|调试|人脸|核验|setup|device test/i],
  ['sign', /签约|三方|签署|合同|contract|sign/i],
  ['docs', /材料|资料|简历|证明|document|paperwork|upload/i],
  ['pay', /缴费|付款|续费|账单|发票|payment|pay|invoice|renew/i],
  ['reply', /回复|回信|reply|respond/i],
  ['review', /审批|审核|review|approve/i],
  ['exam', /笔试|考试|online test|exam/i],
  ['assess', /测评|测试|assessment|evaluation/i],
  ['interview', /面试|interview/i],
  ['checkup', /体检|medical|check-?up/i],
  ['meeting', /会议|开会|宣讲|讲座|meeting|call|webinar|session/i],
]

const ORG_SUFFIX = /(股份有限公司|有限责任公司|有限公司|集团|公司|总行|分行|科技|汽车|控股|股份|招聘|校招|人力资源部|hr|inc\.?|ltd\.?|llc|corp\.?|co\.?|group|limited|careers?|recruit(ing|ment)?)$/i

/** Lowercased organisation name without punctuation and common corporate suffixes. */
export function normOrg(org) {
  let s = String(org ?? '').toLowerCase().replace(/[\s·・.,，、()（）【】\[\]'"-]/g, '')
  for (let i = 0; i < 3; i += 1) s = s.replace(ORG_SUFFIX, '')
  return s
}

/** Split 「机构：动作」 / "Org: action" titles. */
export function titleParts(title) {
  const t = String(title ?? '').replace(/^⚠️\s*/, '')
  const m = /^([^：:]{1,30})[：:]\s*(.*)$/.exec(t)
  const org = m ? normOrg(m[1]) : ''
  const rest = m ? m[2] : t
  // 机构前缀里多出来的词（"UOB MAP"）也可能是动作的一部分，所以 kind 看整串。
  const kind = (KINDS.find(([, re]) => re.test(rest)) ?? KINDS.find(([, re]) => re.test(t)) ?? [''])[0]
  return { org, kind, rest }
}

function orgMatch(a, b) {
  if (!a || !b) return false
  if (a === b) return true
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  return short.length >= 2 && long.startsWith(short)
}

/** Days between two YYYY-MM-DD, or null. */
export function daysApart(a, b) {
  if (!a || !b) return null
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000
}

/**
 * Same task? Organisation (normalised, prefix-tolerant) + kind group is the strong
 * signal; text similarity is the fallback. Two dated items further apart than
 * `windowDays` are never the same task (weekly meetings, two rounds of exams).
 */
export function sameTask(a, b, { windowDays = 3 } = {}) {
  const gap = daysApart(a.dueDate, b.dueDate)
  if (gap !== null && gap > windowDays) return false
  const pa = titleParts(a.title)
  const pb = titleParts(b.title)
  if (pa.org && pb.org) {
    if (!orgMatch(pa.org, pb.org)) return similarity(a.title, b.title) >= 0.85
    if (pa.kind && pb.kind) return pa.kind === pb.kind
    return similarity(pa.rest, pb.rest) >= 0.5
  }
  return similarity(a.title, b.title) >= 0.6
}
