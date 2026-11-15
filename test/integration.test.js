import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPlanner, createStateFile } from '../lib/planner.js'
import { apply } from '../index.js'
import { normalizeConfig } from '../lib/config.js'
import { normTime, normDate, isNoise, ruleExtract } from '../lib/rules.js'

import { todoLib } from './helpers.js'
const TODO = todoLib()
const { createStore } = await import(`${TODO}/store.js`)
const { createApi } = await import(`${TODO}/api.js`)
const { createTool } = await import(`${TODO}/tool.js`)

const NOW = new Date(2026, 10, 12, 21, 40) // 2026-11-12 21:40 本地
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3600e3).toISOString()

function mailbox(initial) {
  const box = { uidValidity: 777, msgs: [...initial] }
  return {
    box,
    list({ limit = 30, offset = 0 }) {
      const sorted = [...box.msgs].sort((a, b) => b.uid - a.uid)
      return { account: 'default', folder: 'INBOX', uidValidity: box.uidValidity, messages: sorted.slice(offset, offset + limit).map(({ body, ...env }) => env) }
    },
    read({ uid }) {
      const m = box.msgs.find((x) => x.uid === uid)
      if (!m) throw new Error('no such uid')
      return { ...m, text: m.body, attachments: [] }
    },
  }
}

const REPLIES = {
  电信: { v: 1, actionable: true, items: [{ key: 'ctg-test-1114', title: '中国电信：线上笔试·计算机类', dueDate: '2026-11-14', dueTime: '09:00', priority: 'high', prep: 'Chrome+摄像头+手机第二机位', quote: '11月14日9:00-11:00' }] },
  中远: { v: 1, actionable: true, items: [
    { key: 'cosco-confirm', title: '中远海运：确认参加笔试', dueDate: '11月13日', dueTime: '18:00', priority: 'high', prep: '', quote: '13日18:00前确认' },
    { key: 'cosco-test-1114', title: '中远海运：集中笔试', dueDate: '2026-11-14', dueTime: '9:30', priority: 'high', prep: '提前人脸核验', quote: '14日9:30开考' },
    { key: 'past-thing', title: '中远海运：宣讲会', dueDate: '2026-11-01', dueTime: '10:00', priority: 'low', prep: '', quote: '' },
  ] },
  广东能源: { v: 1, actionable: true, items: [{ key: 'gdenergy-test', title: '广东能源集团：第二批次笔试', dueDate: '2026-11-16', dueTime: '14:00', priority: 'high', prep: '', quote: '' }] },
  汇川: { v: 1, actionable: true, items: [{ key: 'inovance-assess', title: '汇川技术：在线测评', dueDate: '2026-11-22', dueTime: '', priority: 'medium', prep: '', quote: '' }] },
}

function fakeLlm({ garbageFirst = new Set(), fail = false } = {}) {
  const calls = []
  const seen = new Set()
  return {
    calls,
    stream: async function* (opts) {
      const prompt = opts.messages[0].content[0].text
      calls.push(prompt)
      if (fail) throw new Error('provider down')
      const k = Object.keys(REPLIES).find((x) => prompt.includes(x))
      if (k && garbageFirst.has(k) && !seen.has(k)) { seen.add(k); yield { type: 'text-delta', text: '好的，我来分析一下……' }; yield { type: 'finish', reason: { kind: 'stop' } }; return }
      const reply = k ? REPLIES[k] : { v: 1, actionable: false, items: [] }
      yield { type: 'text-delta', text: '<think>思考</think>```json\n' + JSON.stringify(reply) + '\n```' }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
}

async function harness({ mails, llm, config = {}, preTodos = [] }) {
  const dir = await mkdtemp(join(tmpdir(), 'ip-'))
  const tstore = createStore({ file: join(dir, 'todos.json') })
  const ready = tstore.load()
  const api = createApi(tstore)
  const todoTool = createTool(api, ready)
  for (const t of preTodos) await todoTool.execute({ action: 'add', ...t })
  const mb = mailbox(mails)
  const tools = {
    personal_todo: (a) => todoTool.execute(a),
    email_list: (a) => mb.list(a),
    email_read: (a) => mb.read(a),
  }
  const toolCalls = []
  const cfg = normalizeConfig({ backfillDays: 3, language: 'zh', ...config })
  const planner = createPlanner({
    callTool: async (n, a) => { toolCalls.push([n, a]); return tools[n](a) },
    hasTool: (n) => n in tools,
    route: () => (llm ? { llm, provider: 'deepseek', model: 'deepseek-chat' } : null),
    store: createStateFile(join(dir, 'state.json')),
    getConfig: () => cfg,
    clock: () => NOW,
  })
  const todos = async () => (await todoTool.execute({ action: 'list', view: 'open' })).items
  return { planner, mb, todos, toolCalls, dir, todoTool }
}

const BASE = [
  { uid: 101, subject: '【中国电信】线上笔试通知', from: { name: '中国电信招聘', address: 'hr@chinatelecom.cn' }, date: hoursAgo(5), body: '请于11月14日9:00-11:00参加线上笔试，计算机类。' },
  { uid: 102, subject: '中远海运笔试安排', from: 'exam@iguokao.com', date: hoursAgo(3), body: '请于13日18:00前确认参加，14日9:30开考。' },
  { uid: 103, subject: 'Microsoft 帐户安全代码', from: 'account-security-noreply@accountprotection.microsoft.com', date: hoursAgo(2), body: '安全代码 123456' },
  { uid: 104, subject: '感谢您投递海辰人力的岗位', from: 'hr@haichen.com', date: hoursAgo(2), body: '我们已收到您的简历' },
  { uid: 50, subject: '一周前的老邮件 笔试', from: 'x@y.com', date: hoursAgo(24 * 9), body: '11月10日笔试' },
]

test('首次运行：只回补 backfillDays 内，噪音不调模型，拆条、过期丢弃、撞车双向标注', async () => {
  const llm = fakeLlm({ garbageFirst: new Set(['电信']) })
  const h = await harness({ mails: BASE, llm })
  const r = await h.planner.runOnce()
  assert.equal(r.ok, true, JSON.stringify(r.errors))
  assert.equal(r.scanned, 4) // uid 50 超出回补窗口
  assert.equal(r.noise, 2)
  assert.equal(r.created.length, 3)
  // 电信第一次回垃圾、修复后成功；噪音邮件不进模型
  assert.equal(llm.calls.filter((p) => p.includes('电信')).length, 2)
  assert.ok(!llm.calls.some((p) => p.includes('安全代码') || p.includes('海辰')))
  const items = await h.todos()
  const ctg = items.find((t) => t.title.includes('中国电信'))
  const cosco = items.find((t) => t.title.includes('集中笔试'))
  const confirm = items.find((t) => t.title.includes('确认参加'))
  assert.equal(ctg.dueDate, '2026-11-14'); assert.equal(ctg.dueTime, '09:00'); assert.equal(ctg.category, '邮件'); assert.equal(ctg.priority, 'high')
  assert.equal(confirm.dueDate, '2026-11-13'); assert.equal(confirm.dueTime, '18:00')
  assert.equal(cosco.dueTime, '09:30')
  assert.ok(cosco.title.startsWith('⚠️'))
  assert.match(cosco.note, /时间冲突：09:00 还有「中国电信/)
  assert.match(ctg.note, /时间冲突：09:30 还有「中远海运：集中笔试」/)
  assert.match(ctg.note, /#inbox-planner uid=101 key=ctg-test-1114/)
  assert.ok(!items.some((t) => t.title.includes('宣讲会')))
})

test('增量：第二轮无新邮件不读正文；新邮件补全已有待办的时间而不是重复建', async () => {
  const llm = fakeLlm()
  const h = await harness({ mails: BASE, llm, preTodos: [{ title: '广东能源集团：第二批次笔试', priority: 'medium', category: '秋招' }] })
  await h.planner.runOnce()
  const before = h.toolCalls.length
  const r2 = await h.planner.runOnce()
  assert.equal(r2.scanned, 0)
  assert.deepEqual(h.toolCalls.slice(before).map((c) => c[0]), ['email_list'])
  h.mb.box.msgs.push({ uid: 110, subject: '广东能源集团第二批次笔试正式通知', from: 'zp@gdenergy.com', date: NOW.toISOString(), body: '11月16日14:00开考' })
  h.mb.box.msgs.push({ uid: 111, subject: '汇川技术在线测评邀请', from: 'hr@inovance.com', date: NOW.toISOString(), body: '请于11月22日前完成' })
  const r3 = await h.planner.runOnce()
  assert.equal(r3.created.length, 1, JSON.stringify(r3))
  assert.equal(r3.updated.length, 1)
  const items = await h.todos()
  const gd = items.filter((t) => t.title.includes('广东能源'))
  assert.equal(gd.length, 1)
  assert.equal(gd[0].dueDate, '2026-11-16'); assert.equal(gd[0].dueTime, '14:00'); assert.equal(gd[0].category, '秋招')
  // 同一封再来一次（例如转发）：key 去重
  h.mb.box.msgs.push({ uid: 112, subject: 'Fwd: 汇川技术在线测评邀请', from: 'me@qq.com', date: NOW.toISOString(), body: '请于11月22日前完成' })
  const r4 = await h.planner.runOnce()
  assert.equal(r4.created.length, 0)
  assert.equal(r4.duplicates, 1)
})

test('模型挂了：auto 退回规则引擎，照样带日期时间入列', async () => {
  const h = await harness({ mails: BASE.slice(0, 1), llm: fakeLlm({ fail: true }) })
  const r = await h.planner.runOnce()
  assert.equal(r.created.length, 1)
  assert.match(r.errors[0], /provider down/)
  const [t] = await h.todos()
  assert.equal(t.dueDate, '2026-11-14'); assert.equal(t.dueTime, '09:00')
})

test('engine=llm 严格模式：失败不推进水位，恢复后补处理', async () => {
  const h = await harness({ mails: BASE.slice(0, 1), llm: fakeLlm({ fail: true }), config: { engine: 'llm' } })
  const r = await h.planner.runOnce()
  assert.equal(r.created.length, 0)
  const st = JSON.parse(await readFile(join(h.dir, 'state.json'), 'utf8'))
  assert.equal(st.accounts.default.lastUid, null)
})

test('uidValidity 变化：重建基线，不重复建待办', async () => {
  const h = await harness({ mails: BASE, llm: fakeLlm() })
  await h.planner.runOnce()
  h.mb.box.uidValidity = 999
  const r = await h.planner.runOnce()
  assert.match(r.notices.join(), /重建基线/)
  assert.equal(r.created.length, 0)
  assert.equal((await h.todos()).length, 3)
})

test('分页：离线期间来了 70 封，也能翻页追上', async () => {
  const h = await harness({ mails: BASE.slice(0, 1), llm: fakeLlm() })
  await h.planner.runOnce()
  for (let i = 0; i < 70; i += 1) h.mb.box.msgs.push({ uid: 200 + i, subject: `周报 ${i}`, from: 'a@b.c', date: NOW.toISOString(), body: '无' })
  const r = await h.planner.runOnce()
  assert.equal(r.scanned, 70)
})

test('缺工具时报清楚', async () => {
  const p = createPlanner({ callTool: async () => ({}), hasTool: () => false, route: () => null, store: { load: async () => ({ seen: {}, keys: {}, lastUid: null }), save: async () => {} }, getConfig: () => normalizeConfig({ language: 'zh' }) })
  const r = await p.runOnce()
  assert.equal(r.ok, false)
  assert.match(r.errors[0], /dsh-email/)
})

test('规则小件', () => {
  assert.equal(normTime('下午3点'), '15:00')
  assert.equal(normTime('3:30 PM'), '15:30')
  assert.equal(normTime('09：15'), '09:15')
  assert.equal(normTime('晚上8点半'), '20:30')
  assert.equal(normDate('1月5日', new Date(2026, 11, 20)), '2027-01-05')
  assert.equal(normDate('2026/11/14'), '2026-11-14')
  assert.equal(isNoise({ subject: '您的验证码是 1234' }), true)
  assert.equal(isNoise({ subject: '笔试安排（含验证码说明）' }), false)
  assert.deepEqual(ruleExtract({ subject: '面试通知', body: '请于11月15日上午9:15到苏州总行' }, NOW).map((i) => [i.dueDate, i.dueTime]), [['2026-11-15', '09:15']])
  assert.deepEqual(ruleExtract({ subject: '月度账单', body: '' }, NOW), [])
})

test('apply：注册工具与命令，轮询关闭时不起定时器', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ip-apply-'))
  process.env.DSH_PROFILE_DIR = dir
  const registered = {}
  const ctx = {
    tools: { register: (t) => { registered[t.name] = t; return () => {} } },
    webServer: { register: () => () => {} }, connection: { requestRejection: () => undefined },
    get: (n) => (n === 'tools' ? { get: () => undefined } : n === 'commands' ? { register: (c) => { registered['/' + c.name] = c; return () => {} } } : undefined),
    effect: (fn) => fn(),
    inject: (_deps, fn) => fn(ctx),
    logger: {},
  }
  apply(ctx, { pollSeconds: 0, language: 'zh' })
  assert.ok(registered.inbox_planner)
  assert.ok(registered['/inbox-sync'])
  const s = await registered.inbox_planner.execute({ action: 'status' })
  assert.equal(s.lastRun, null)
  const r = await registered['/inbox-sync'].handler()
  assert.equal(r.kind, 'error')
  assert.match(r.text, /缺少工具/)
})

test('同机构同类事项判重（含 0.1.1 实测漏掉的 4 对），不同机构不误判', async () => {
  const { sameTask } = await import('../lib/rules.js')
  const S = (a, b, da = '', db = '') => sameTask({ title: a, dueDate: da }, { title: b, dueDate: db }, { windowDays: 3 })
  assert.equal(S('UOB：MAP 在线测评', 'UOB MAP：在线测评'), true)
  assert.equal(S('远景科技集团：完成校园招聘综合测评', '远景：校园招聘综合测评'), true)
  assert.equal(S('奇瑞汽车：重新提交签约材料', '奇瑞：重交签约材料并回信'), true)
  assert.equal(S('苏州银行：完成岗位测评', '苏州银行：查收并完成管培生测评'), true)
  assert.equal(S('广东能源集团：笔试（等通知）', '广东能源集团：第二批次笔试'), true)
  assert.equal(S('Acme Inc: Submit Q3 report', 'Acme: submit Q3 report'), true)
  assert.equal(S('中远海运：确认参加笔试', '中远海运：集中笔试'), false)
  assert.equal(S('中国邮政：线上笔试', '中国电信：线上笔试'), false)
  assert.equal(S('平安银行：笔试', '上海银行：笔试'), false)
  assert.equal(S('苏州银行：现场面试', '苏州银行：管培生测评'), false)
  assert.equal(S('Acme: weekly sync meeting', 'Acme: weekly sync meeting', '2026-11-10', '2026-11-17'), false)
})

test('已完成的待办不会被旧邮件重新建出来，也不参与撞车', async () => {
  const h = await harness({ mails: BASE.slice(0, 1), llm: fakeLlm(), preTodos: [{ title: '中国电信：线上笔试', dueDate: '2026-11-14', dueTime: '09:00' }] })
  const [pre] = await h.todos()
  await h.todoTool.execute({ action: 'complete', id: pre.id })
  const r = await h.planner.runOnce()
  assert.equal(r.created.length, 0)
  assert.equal(r.duplicates, 1)
})
