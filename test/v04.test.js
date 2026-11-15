/** 0.4: invitations, follow-ups (reschedule / cancel), content cache, parallel analysis, sender rules, activity log, export. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPlanner, createStateFile } from '../lib/planner.js'
import { normalizeConfig } from '../lib/config.js'
import { parseInvite, icsTime, todosToIcs, parseLines } from '../lib/ics.js'
import { ruleExtract, changeOf, isNoise } from '../lib/rules.js'
import { readReply } from '../lib/llm.js'
import { todoLib } from './helpers.js'

const TODO = todoLib()
const { createStore } = await import(`${TODO}/store.js`)
const { createApi } = await import(`${TODO}/api.js`)
const { createTool } = await import(`${TODO}/tool.js`)

const NOW = new Date(2026, 10, 12, 21, 40)
const ago = (h) => new Date(NOW.getTime() - h * 3600e3).toISOString()

function llmFrom(map, { delay = () => 0 } = {}) {
  const prompts = []
  let inFlight = 0
  const stats = { maxInFlight: 0 }
  return {
    prompts,
    stats,
    stream: async function* (opts) {
      const p = opts.messages[0].content[0].text
      prompts.push(p)
      inFlight += 1
      stats.maxInFlight = Math.max(stats.maxInFlight, inFlight)
      await new Promise((r) => setTimeout(r, delay(p)))
      inFlight -= 1
      const hit = Object.entries(map).find(([k]) => p.includes(k))
      yield { type: 'text-delta', text: JSON.stringify(hit ? hit[1] : { v: 1, actionable: false, items: [] }) }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
}

async function harness({ mails, llm, config = {}, extraTools = {}, accounts = ['work'], mailsFor = null }) {
  const dir = await mkdtemp(join(tmpdir(), 'ip-v04-'))
  const store = createStore({ file: join(dir, 'todos.json') })
  const ready = store.load()
  const todoTool = createTool(createApi(store), ready)
  const calls = []
  const box = (account) => (mailsFor ? mailsFor[account] : mails)
  const tools = {
    personal_todo: (a) => todoTool.execute(a),
    email_list: ({ limit = 30, offset = 0, account }) => ({ account, uidValidity: 1, messages: [...box(account)].sort((a, b) => b.uid - a.uid).slice(offset, offset + limit).map(({ body, to, cc, attachments, ...e }) => e) }),
    email_read: ({ uid, account }) => { const m = box(account).find((x) => x.uid === uid); return { ...m, text: m.body, attachments: m.attachments ?? [] } },
    email_health: () => ({ checks: accounts.map((a) => ({ name: `账号 ${a}`, detail: `custom / me@${a}.com / IMAP` })) }),
    ...extraTools,
  }
  let cfg = normalizeConfig({ backfillDays: 3, language: 'zh', ...config })
  const planner = createPlanner({
    callTool: async (n, a) => { calls.push([n, a]); return tools[n](a) },
    hasTool: (n) => n in tools,
    route: () => (llm ? { llm, provider: 'p', model: 'm' } : null),
    store: createStateFile(join(dir, 'state.json')),
    getConfig: () => cfg,
    clock: () => NOW,
  })
  const all = async (view) => (await todoTool.execute({ action: 'list', view })).items
  return { dir, planner, calls, todos: () => all('open'), done: () => all('done'), setConfig: (c) => { cfg = normalizeConfig({ backfillDays: 3, language: 'zh', ...c }) } }
}

const INVITE = [
  'BEGIN:VCALENDAR', 'METHOD:REQUEST', 'BEGIN:VTIMEZONE', 'TZID:China Standard Time', 'END:VTIMEZONE',
  'BEGIN:VEVENT', 'UID:abc-123@acme.com', 'SEQUENCE:0',
  'ORGANIZER;CN="Acme HR":mailto:hr@acme.com',
  'DTSTART;TZID=China Standard Time:20261120T140000', 'DTEND;TZID=China Standard Time:20261120T150000',
  'SUMMARY:Second-round interv', ' iew', 'LOCATION:Room 5\\, Building A', 'DESCRIPTION:Bring your ID', 'END:VEVENT', 'END:VCALENDAR',
].join('\r\n')

test('ics：折行、带引号的 CN、Windows 时区名、UTC、全天', () => {
  const lines = parseLines(INVITE)
  assert.equal(lines.find((l) => l.name === 'SUMMARY').value, 'Second-round interview')
  assert.equal(lines.find((l) => l.name === 'ORGANIZER').params.CN, 'Acme HR')
  const inv = parseInvite(INVITE, NOW)
  assert.equal(inv.method, 'REQUEST')
  const [x] = inv.items
  assert.equal(x.title, 'Acme HR: Second-round interview')
  assert.equal(x.location, 'Room 5, Building A')
  assert.equal(x.durationMinutes, 60)
  assert.equal(x.change, 'new')
  // 20261120T140000 China Standard Time = 06:00 UTC; shown in this machine's local time.
  const local = new Date(Date.UTC(2026, 10, 20, 6, 0))
  assert.equal(x.dueTime, `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`)
  assert.equal(icsTime({ value: '20261120', params: { VALUE: 'DATE' } }).date, '2026-11-20')
  const z = icsTime({ value: '20261120T060000Z', params: {} })
  assert.equal(z.time, x.dueTime)
  const cancel = parseInvite(INVITE.replace('METHOD:REQUEST', 'METHOD:CANCEL'), NOW)
  assert.equal(cancel.items[0].change, 'cancel')
  const update = parseInvite(INVITE.replace('SEQUENCE:0', 'SEQUENCE:2'), NOW)
  assert.equal(update.items[0].change, 'reschedule')
  assert.equal(parseInvite('hello', NOW), null)
})

test('导出 .ics：带时间的是定时事件，只有日期的是全天，长行按 75 字节折行', () => {
  const text = todosToIcs([
    { id: 't1', title: '中国电信：线上笔试·计算机类·很长很长很长很长很长很长很长很长很长的标题', dueDate: '2026-11-14', dueTime: '09:00', priority: 'high', note: '准备 Chrome\n#inbox-planner uid=1' },
    { id: 't2', title: 'Pay rent', dueDate: '2026-11-30' },
    { id: 't3', title: 'No date' },
  ], { now: NOW })
  assert.match(text, /BEGIN:VCALENDAR/)
  assert.equal(text.match(/BEGIN:VEVENT/g).length, 2)
  assert.match(text, /DTSTART;VALUE=DATE:20261130/)
  assert.match(text, /PRIORITY:1/)
  assert.doesNotMatch(text, /#inbox-planner/)
  for (const line of text.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, line)
  // Round trip through our own parser.
  const back = parseInvite(text, new Date(2026, 10, 1))
  assert.equal(back.items.length, 2)
  assert.equal(back.items[0].dueTime, '09:00')
})

test('会议邀请：直接读 .ics，不调用模型；临时下载的文件读完删掉', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ip-ics-'))
  const path = join(dir, 'invite.ics')
  const llm = llmFrom({})
  const h = await harness({
    llm,
    mails: [{ uid: 1, subject: 'Invitation: Second-round interview', from: { name: 'Acme HR', address: 'hr@acme.com' }, to: [{ address: 'me@work.com' }], date: ago(1), body: 'You have been invited.', attachments: [{ filename: 'invite.ics', contentType: 'text/calendar', size: INVITE.length, part: '2' }] }],
    extraTools: { email_attachment: async ({ index }) => { assert.equal(index, 0); await writeFile(path, INVITE); return { path, size: Buffer.byteLength(INVITE), filename: 'invite.ics' } } },
  })
  const r = await h.planner.runOnce()
  assert.equal(r.llmCalls, 0)
  assert.equal(r.invites, 1)
  assert.equal(r.created.length, 1)
  const [x] = await h.todos()
  assert.equal(x.dueDate, '2026-11-20')
  assert.match(x.note, /📅/)
  await assert.rejects(access(path))
})

test('改期：后来的邮件把面试挪了时间 → 更新原条目（不新建），日历事件跟着挪', async () => {
  const llm = llmFrom({
    面试邀请: { v: 1, actionable: true, items: [{ key: 'szb-interview', kind: 'event', title: '苏州银行：现场面试', dueDate: '2026-11-18', dueTime: '10:00', priority: 'high' }] },
    面试改期: { v: 1, actionable: true, items: [{ key: 'szb-interview', kind: 'event', change: 'reschedule', title: '苏州银行：现场面试', dueDate: '2026-11-20', dueTime: '14:00', priority: 'high' }] },
  })
  const calendar = []
  const mails = [{ uid: 1, subject: '苏州银行面试邀请', from: { address: 'hr@szb.com' }, to: [{ address: 'me@work.com' }], date: ago(5), body: '请于11月18日10:00参加面试' }]
  const h = await harness({
    llm, mails, config: { calendar: 'events' },
    extraTools: {
      calendar_create: (a) => { calendar.push(['create', a]); return { created: { uid: 'ev-1' } } },
      calendar_update: (a) => { calendar.push(['update', a]); return { updated: { uid: a.uid } } },
      calendar_delete: (a) => { calendar.push(['delete', a]); return { deleted: true } },
    },
  })
  await h.planner.runOnce()
  mails.push({ uid: 2, subject: '苏州银行面试改期通知', from: { address: 'hr@szb.com' }, to: [{ address: 'me@work.com' }], date: ago(1), body: '原定11月18日的面试改至11月20日14:00' })
  const r = await h.planner.runOnce()
  assert.equal(r.created.length, 0)
  assert.equal(r.moved, 1)
  const list = await h.todos()
  assert.equal(list.length, 1)
  assert.equal(list[0].dueDate, '2026-11-20')
  assert.equal(list[0].dueTime, '14:00')
  assert.match(list[0].note, /🔁/)
  assert.deepEqual(calendar.map(([k]) => k), ['create', 'update'])
  assert.equal(calendar[1][1].uid, 'ev-1')
})

test('取消：原条目打上 ❌ 并勾掉，日历事件删除；没有原条目的取消不新建', async () => {
  const llm = llmFrom({
    会议邀请: { v: 1, actionable: true, items: [{ key: 'acme-review', kind: 'event', title: 'Acme：季度评审会', dueDate: '2026-11-19', dueTime: '15:00', priority: 'medium' }] },
    会议取消: { v: 1, actionable: true, items: [{ key: 'acme-review', kind: 'event', change: 'cancel', title: 'Acme：季度评审会', dueDate: '2026-11-19', dueTime: '', priority: 'medium' }] },
    培训取消: { v: 1, actionable: true, items: [{ key: 'other', kind: 'event', change: 'cancel', title: 'Beta：入职培训', dueDate: '', priority: 'low' }] },
  })
  const calendar = []
  const mails = [{ uid: 1, subject: 'Acme 会议邀请', from: { address: 'pm@acme.com' }, to: [{ address: 'me@work.com' }], date: ago(5), body: '11月19日15:00 季度评审' }]
  const h = await harness({
    llm, mails,
    extraTools: {
      calendar_create: () => ({ created: { uid: 'ev-9' } }),
      calendar_delete: (a) => { calendar.push(a); return { deleted: true } },
    },
  })
  await h.planner.runOnce()
  mails.push({ uid: 2, subject: 'Acme 会议取消', from: { address: 'pm@acme.com' }, to: [{ address: 'me@work.com' }], date: ago(2), body: '原定评审会取消' })
  mails.push({ uid: 3, subject: 'Beta 培训取消', from: { address: 'hr@beta.com' }, to: [{ address: 'me@work.com' }], date: ago(1), body: '入职培训取消' })
  const r = await h.planner.runOnce()
  assert.equal(r.cancelled, 1)
  assert.equal(r.created.length, 0)
  assert.equal((await h.todos()).length, 0)
  const done = await h.done()
  assert.match(done[0].title, /^❌/)
  assert.deepEqual(calendar, [{ uid: 'ev-9' }])
})

test('规则引擎：改期取「改至」后的日期；取消/改期主题不会被当成噪音', () => {
  const [x] = ruleExtract({ subject: '面试改期通知', body: '原定11月18日10:00的面试改至11月20日14:00，请准时参加。' }, NOW)
  assert.equal(x.change, 'reschedule')
  assert.equal(x.dueDate, '2026-11-20')
  assert.equal(x.dueTime, '14:00')
  assert.equal(changeOf('【已取消】周会'), 'cancel')
  assert.equal(changeOf('Meeting rescheduled'), 'reschedule')
  assert.equal(isNoise({ subject: '推广活动取消通知', from: 'shop' }), false)
  // A cancellation may point at a date that already passed; a reschedule without a date is just new.
  const r = readReply(JSON.stringify({ v: 1, items: [{ title: 'A：会议', change: 'cancel', dueDate: '2026-11-01' }, { title: 'B：面试', change: 'reschedule' }] }), { now: NOW, maxItems: 3 })
  assert.deepEqual(r.items.map((i) => i.change), ['cancel', 'new'])
})

test('同一封通知同时进了两个邮箱：只调用一次模型', async () => {
  const llm = llmFrom({ 体检: { v: 1, actionable: true, items: [{ key: 'checkup', kind: 'event', title: '公司：入职体检', dueDate: '2026-11-21', dueTime: '08:30', priority: 'high' }] } })
  const mail = { subject: '入职体检安排', from: { address: 'hr@corp.com' }, to: [{ address: 'me@a.com' }, { address: 'me@b.com' }], date: ago(1), body: '请于11月21日8:30空腹体检' }
  const h = await harness({ llm, accounts: ['a', 'b'], mailsFor: { a: [{ uid: 1, ...mail }], b: [{ uid: 7, ...mail }] } })
  const r = await h.planner.runOnce()
  assert.equal(r.llmCalls, 1)
  assert.equal(r.cacheHits, 1)
  assert.equal(r.created.length, 1)
  assert.equal(r.duplicates, 1)
})

test('并行分析：同时最多 concurrency 封，写入仍按邮件顺序', async () => {
  const map = {}
  const mails = []
  for (let i = 1; i <= 6; i += 1) {
    map[`编号${i}号`] = { v: 1, actionable: true, items: [{ key: `job-${i}`, kind: 'task', title: `机构${i}：提交材料`, dueDate: `2026-11-${20 + i}`, priority: 'medium' }] }
    mails.push({ uid: i, subject: `材料提交 编号${i}号`, from: { address: `hr${i}@org${i}.com` }, to: [{ address: 'me@work.com' }], date: ago(7 - i), body: `编号${i}号 请提交材料` })
  }
  // Earlier mails answer slower, so a sequential writer would be the only way to keep order.
  const llm = llmFrom(map, { delay: (p) => 60 - Number(/编号(\d)号/.exec(p)[1]) * 8 })
  const h = await harness({ llm, mails, config: { concurrency: 3 } })
  const t0 = Date.now()
  const r = await h.planner.runOnce()
  assert.equal(r.created.length, 6)
  assert.ok(llm.stats.maxInFlight <= 3 && llm.stats.maxInFlight >= 2, `maxInFlight ${llm.stats.maxInFlight}`)
  assert.deepEqual(r.created.map((c) => /机构(\d)/.exec(c)[1]), ['1', '2', '3', '4', '5', '6'])
  assert.ok(Date.now() - t0 < 6 * 60, 'ran in parallel')
})

test('严格模式出错：停在出错那封，后面的不写入，下次重试', async () => {
  let fail = true
  const llm = {
    stream: async function* (opts) {
      const p = opts.messages[0].content[0].text
      if (p.includes('第二封') && fail) throw new Error('rate limited')
      yield { type: 'text-delta', text: JSON.stringify({ v: 1, items: [{ key: p.includes('第一封') ? 'a' : 'c', title: p.includes('第一封') ? '甲：回复确认' : '丙：回复确认', dueDate: '2026-11-25', priority: 'medium' }] }) }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
  const mails = ['第一封', '第二封', '第三封'].map((s, i) => ({ uid: i + 1, subject: `请回复 ${s}`, from: { address: `x${i}@y${i}.com` }, to: [{ address: 'me@work.com' }], date: ago(3 - i), body: s }))
  const h = await harness({ llm, mails, config: { engine: 'llm', concurrency: 3 } })
  const r1 = await h.planner.runOnce()
  assert.equal(r1.created.length, 1)
  fail = false
  const r2 = await h.planner.runOnce()
  assert.equal(r2.scanned, 2)
  assert.equal((await h.todos()).length, 2)
})

test('忽略发件人 / 总是分析的发件人；处理记录里能看到决定', async () => {
  const llm = llmFrom({ 账单: { v: 1, actionable: true, items: [{ key: 'bill', title: '银行：信用卡还款', dueDate: '2026-11-25', priority: 'high' }] } })
  const mails = [
    { uid: 1, subject: '本月促销', from: { name: 'Shop', address: 'news@shop.com' }, to: [{ address: 'me@work.com' }], date: ago(3), body: '优惠' },
    { uid: 2, subject: '账单 newsletter', from: { name: 'Bank', address: 'card@bank.com' }, to: [{ address: 'me@work.com' }], date: ago(2), body: '请于11月25日前还款' },
  ]
  const h = await harness({ llm, mails, config: { alwaysSenders: 'bank.com' } })
  await h.planner.setSender('shop.com', true)
  const r = await h.planner.runOnce()
  assert.equal(r.ignored, 1)
  assert.equal(r.created.length, 1)
  const log = await h.planner.activity()
  assert.deepEqual(log.items.map((e) => e.what), ['todo', 'ignored'])
  assert.equal(log.items[0].fromAddr, 'card@bank.com')
  assert.deepEqual(log.ignored, ['shop.com'])
  assert.equal(log.stats.runs, 1)
  await h.planner.setSender('shop.com', false)
  assert.deepEqual((await h.planner.activity()).ignored, [])
})

test('「还是建一条」：被判成噪音的邮件强制重看，按主题建待办', async () => {
  const h = await harness({
    llm: llmFrom({}),
    mails: [{ uid: 9, subject: '问卷：请于周五前填写入职信息', from: { address: 'hr@corp.com' }, to: [{ address: 'me@work.com' }], date: ago(1), body: '谢谢' }],
  })
  const r1 = await h.planner.runOnce()
  assert.equal(r1.created.length, 0)
  const r2 = await h.planner.rescan(9, 'work', { force: true })
  assert.equal(r2.created.length, 1)
  const [x] = await h.todos()
  assert.equal(x.title, '问卷：请于周五前填写入职信息')
})
