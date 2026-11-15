/** Features that make it a general-purpose plugin: live settings, i18n, CC handling, calendar mirror, rescan. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPlanner, createStateFile, localIso } from '../lib/planner.js'
import { Config, normalizeConfig, FIELDS } from '../lib/config.js'
import { todoLib } from './helpers.js'

const TODO = todoLib()
const { createStore } = await import(`${TODO}/store.js`)
const { createApi } = await import(`${TODO}/api.js`)
const { createTool } = await import(`${TODO}/tool.js`)

const NOW = new Date(2026, 10, 12, 21, 40)
const ago = (h) => new Date(NOW.getTime() - h * 3600e3).toISOString()

function llmFrom(map) {
  const prompts = []
  return {
    prompts,
    stream: async function* (opts) {
      const p = opts.messages[0].content[0].text
      prompts.push(p)
      const hit = Object.entries(map).find(([k]) => p.includes(k))
      yield { type: 'text-delta', text: JSON.stringify(hit ? hit[1] : { v: 1, actionable: false, items: [] }) }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
}

async function harness({ mails, llm, config = {}, preTodos = [], extraTools = {}, self = 'me@corp.com' }) {
  const dir = await mkdtemp(join(tmpdir(), 'ip-gen-'))
  const store = createStore({ file: join(dir, 'todos.json') })
  const ready = store.load()
  const todoTool = createTool(createApi(store), ready)
  for (const x of preTodos) await todoTool.execute({ action: 'add', ...x })
  const calls = []
  const tools = {
    personal_todo: (a) => todoTool.execute(a),
    email_list: ({ limit = 30, offset = 0 }) => ({ account: 'work', uidValidity: 1, messages: [...mails].sort((a, b) => b.uid - a.uid).slice(offset, offset + limit).map(({ body, to, cc, ...e }) => e) }),
    email_read: ({ uid }) => { const m = mails.find((x) => x.uid === uid); return { ...m, text: m.body, attachments: [] } },
    email_health: () => ({ checks: [{ name: '账号 work', detail: `custom / ${self} / IMAP imap.corp.com / SMTP smtp.corp.com` }] }),
    ...extraTools,
  }
  let cfg = normalizeConfig({ backfillDays: 3, ...config })
  const planner = createPlanner({
    callTool: async (n, a) => { calls.push([n, a]); return tools[n](a) },
    hasTool: (n) => n in tools,
    route: () => (llm ? { llm, provider: 'p', model: 'm' } : null),
    store: createStateFile(join(dir, 'state.json')),
    getConfig: () => cfg,
    clock: () => NOW,
  })
  return { planner, calls, todos: async () => (await todoTool.execute({ action: 'list', view: 'open' })).items, setConfig: (c) => { cfg = normalizeConfig({ backfillDays: 3, ...c }) } }
}

test('Config schema：默认值完整，volatile 活引用改动后 normalizeConfig 立即读到新值', () => {
  const live = Config({})
  const n = normalizeConfig(live)
  for (const f of FIELDS) if (!['category', 'language', 'selfAddresses', 'accounts', 'ignoreSenders', 'alwaysSenders'].includes(f.key)) assert.deepEqual(n[f.key], f.def, f.key)
  // 模拟设置页修改：volatile 字段是带 get() 的活引用
  const edited = { ...live, pollSeconds: { get: () => 300 }, language: { get: () => 'en' }, category: { get: () => '' } }
  const m = normalizeConfig(edited)
  assert.equal(m.pollSeconds, 300)
  assert.equal(m.category, '')
  assert.equal(m.categoryDefault, 'Mail')
  assert.equal(normalizeConfig({ pollSeconds: 999999, engine: 'bogus', language: 'zh' }).pollSeconds, 86400)
  assert.equal(normalizeConfig({ engine: 'bogus' }).engine, 'auto')
  assert.equal(normalizeConfig({ language: 'zh' }).categoryDefault, '邮件')
  assert.deepEqual(normalizeConfig({ selfAddresses: 'A@x.com, b@y.com；junk' }).selfAddresses, ['a@x.com', 'b@y.com'])
})

test('英文环境：英文邮件、英文备注、分类 Mail；提示词告诉模型收件方式', async () => {
  const llm = llmFrom({ 'Q3 expense': { v: 1, actionable: true, items: [{ key: 'acme-q3-expense', title: 'Acme: submit Q3 expense report', dueDate: '2026-11-20', dueTime: '17:00', priority: 'medium', prep: 'Attach receipts', quote: 'please submit by Nov 20, 5pm', location: '' }] } })
  const h = await harness({
    llm,
    config: { language: 'en' },
    mails: [{ uid: 1, subject: 'Action required: Q3 expense report', from: { name: 'Finance', address: 'fin@acme.com' }, to: [{ address: 'me@corp.com' }], date: ago(1), body: 'Hi, please submit your Q3 expense report by Nov 20, 5pm.' }],
  })
  const r = await h.planner.runOnce()
  assert.equal(r.created.length, 1)
  const [x] = await h.todos()
  assert.equal(x.category, 'Mail')
  assert.match(x.note, /^📧 Finance · Action required/)
  assert.match(x.note, /Prepare: Attach receipts/)
  assert.match(llm.prompts[0], /Recipient: addressed to the recipient directly/)
})

test('仅抄送：提示词标明 CC；规则引擎直接不生成', async () => {
  const mail = { uid: 1, subject: 'Meeting invitation: design review', from: 'boss@corp.com', to: [{ address: 'team@corp.com' }], cc: [{ address: 'me@corp.com' }], date: ago(1), body: 'Design review on 11/18 at 10:00' }
  const llm = llmFrom({})
  const a = await harness({ llm, mails: [mail] })
  await a.planner.runOnce()
  assert.match(llm.prompts[0], /Recipient: recipient is only on CC/)
  const b = await harness({ llm: null, mails: [mail], config: { engine: 'rules' } })
  const r = await b.planner.runOnce()
  assert.equal(r.created.length, 0)
  const c = await harness({ llm: null, mails: [mail], config: { engine: 'rules', skipCcOnly: false } })
  assert.equal((await c.planner.runOnce()).created.length, 1)
})

test('0.1.1 实测的跨来源重复：手动建的 4 条在，邮件来了不再重复建', async () => {
  const reply = (title, dueDate = '') => ({ v: 1, actionable: true, items: [{ key: '', title, dueDate, dueTime: '', priority: 'high', prep: '', quote: '' }] })
  const llm = llmFrom({
    UOB: reply('UOB：MAP 在线测评', '2026-11-16'),
    远景: reply('远景科技集团：完成校园招聘综合测评', '2026-11-15'),
    奇瑞: reply('奇瑞汽车：重新提交签约材料'),
    苏州银行: reply('苏州银行：完成岗位测评', '2026-11-13'),
  })
  const h = await harness({
    llm,
    preTodos: [
      { title: 'UOB MAP：在线测评', dueDate: '2026-11-16' },
      { title: '远景：校园招聘综合测评', dueDate: '2026-11-15' },
      { title: '奇瑞：重交签约材料并回信' },
      { title: '苏州银行：查收并完成管培生测评', dueDate: '2026-11-12' },
    ],
    mails: ['UOB', '远景', '奇瑞', '苏州银行'].map((k, i) => ({ uid: 10 + i, subject: `${k} 通知`, from: 'hr@x.com', date: ago(2), body: '...' })),
  })
  const r = await h.planner.runOnce()
  assert.equal(r.created.length, 0, r.created.join(' | '))
  assert.equal(r.duplicates, 4)
  assert.equal((await h.todos()).length, 4)
})

test('同步到日历：带时间→定时事件（含时区偏移与模型时长），只有日期→全天；不重复；没装日历给出提示', async () => {
  const created = []
  const llm = llmFrom({
    电信: { v: 1, actionable: true, items: [{ key: 'ctg', title: '中国电信：线上笔试', dueDate: '2026-11-14', dueTime: '09:00', durationMinutes: 120, location: 'online', priority: 'high', prep: '', quote: '' }] },
    汇川: { v: 1, actionable: true, items: [{ key: 'inv', title: '汇川技术：在线测评', dueDate: '2026-11-22', dueTime: '', priority: 'medium', prep: '', quote: '' }] },
  })
  const mails = [
    { uid: 1, subject: '电信笔试', from: 'a@ct.cn', date: ago(2), body: '' },
    { uid: 2, subject: '汇川测评', from: 'b@inovance.com', date: ago(1), body: '' },
  ]
  const h = await harness({ llm, mails, config: { calendar: 'all' }, extraTools: { calendar_create: (a) => { created.push(a); return { created: { uid: `ev-${created.length}` } } } } })
  const r = await h.planner.runOnce()
  assert.equal(r.calendar, 2)
  assert.equal(created[0].start, localIso('2026-11-14', '09:00'))
  assert.equal(created[0].end, localIso('2026-11-14', '11:00'))
  assert.match(created[0].start, /^2026-11-14T09:00:00[+-]\d{2}:\d{2}$/)
  assert.equal(created[0].location, 'online')
  assert.deepEqual([created[1].start, created[1].end, created[1].allDay], ['2026-11-22', '2026-11-23', true])
  await h.planner.runOnce()
  assert.equal(created.length, 2)
  const off = await harness({ llm, mails, config: { calendar: 'all', language: 'zh' } })
  const r2 = await off.planner.runOnce()
  assert.ok(r2.notices.some((e) => /dsh-calendar/.test(e)))
  assert.equal(r2.errors.length, 0)
  assert.equal(r2.created.length, 2) // 待办照常写
})

test('rescan：第一页之外的旧邮件也能重新分析，水位不倒退', async () => {
  const mails = Array.from({ length: 40 }, (_, i) => ({ uid: 100 + i, subject: `周报 ${i}`, from: 'x@y.com', date: ago(1), body: '' }))
  mails.push({ uid: 5, subject: '旧邮件：签约材料', from: 'hr@chery.com', date: ago(24 * 20), body: '' })
  const llm = llmFrom({ 签约材料: { v: 1, actionable: true, items: [{ key: 'chery-docs', title: '奇瑞：重交签约材料', dueDate: '', dueTime: '', priority: 'high', prep: '', quote: '' }] } })
  const h = await harness({ llm, mails })
  await h.planner.runOnce()
  const r = await h.planner.rescan(5)
  assert.equal(r.created.length, 1)
  const st = await h.planner.status()
  assert.equal(st.accounts.work.lastUid, 139)
  assert.equal((await h.planner.runOnce()).scanned, 0)
})

test('语言：DSH 界面偏好优先于空的 LANG 和英文系统 Intl（真机上的情况）', async () => {
  const { detectLanguage, readDshLocale } = await import('../lib/config.js')
  const ctx = (pref) => ({ settings: { describe: () => [{ ns: 'other' }, { ns: 'locale', user: { preference: pref }, base: { preference: 'en-US' } }] } })
  assert.equal(readDshLocale(ctx('zh-CN')), 'zh-CN')
  assert.equal(readDshLocale(ctx('')), 'en-US') // 用户没选 → 部署默认
  assert.equal(readDshLocale({ settings: { describe: () => { throw new Error('x') } } }), undefined)
  assert.equal(readDshLocale({ get: () => ({ describe: () => [{ ns: 'locale', user: { preference: 'zh' } }] }) }), 'zh')
  assert.equal(detectLanguage({ locale: 'zh-CN', env: {} }), 'zh')
  assert.equal(detectLanguage({ locale: undefined, env: { LANG: '' } }) === 'zh', /^zh/i.test(Intl.DateTimeFormat().resolvedOptions().locale))
  assert.equal(normalizeConfig({}, { locale: 'zh-Hans' }).language, 'zh')
  assert.equal(normalizeConfig({ language: 'en' }, { locale: 'zh-CN' }).language, 'en') // 显式设置优先
})

test('分类留空：首次运行定下来后固定，语言判定变了也不分叉；显式设置随时生效', async () => {
  const reply = (k) => ({ v: 1, actionable: true, items: [{ key: k, title: `Org${k}：签约材料`, dueDate: '', dueTime: '', priority: 'high', prep: '', quote: '' }] })
  const mails = [{ uid: 1, subject: 'A 通知', from: 'a@a.com', date: ago(2), body: '' }]
  const h = await harness({ llm: llmFrom({ 'A 通知': reply('a'), 'B 通知': reply('b'), 'C 通知': reply('c') }), mails, config: { language: 'zh' } })
  await h.planner.runOnce()
  h.setConfig({ language: 'en' })
  mails.push({ uid: 2, subject: 'B 通知', from: 'b@b.com', date: NOW.toISOString(), body: '' })
  await h.planner.runOnce()
  h.setConfig({ language: 'en', category: '求职' })
  mails.push({ uid: 3, subject: 'C 通知', from: 'c@c.com', date: NOW.toISOString(), body: '' })
  await h.planner.runOnce()
  const cats = (await h.todos()).map((x) => [x.title, x.category]).sort()
  assert.deepEqual(cats, [['Orga：签约材料', '邮件'], ['Orgb：签约材料', '邮件'], ['Orgc：签约材料', '求职']])
})

test('apply：从宿主 settings 读到中文界面 → 报告是中文', async () => {
  const { apply } = await import('../index.js')
  const dir = await mkdtemp(join(tmpdir(), 'ip-loc-'))
  process.env.DSH_PROFILE_DIR = dir
  const reg = {}
  const ctx = {
    tools: { register: (t) => { reg[t.name] = t; return () => {} }, get: () => undefined },
    webServer: { register: () => () => {} }, connection: { requestRejection: () => undefined },
    settings: { describe: () => [{ ns: 'locale', user: { preference: 'zh-CN' } }] },
    get: () => undefined, effect: (fn) => fn(), inject: () => {}, logger: {},
  }
  apply(ctx, { pollSeconds: 0 })
  const s = await reg.inbox_planner.execute({ action: 'status' })
  assert.match(reg.inbox_planner.output.render({}, s)[0].text, /还没运行过/)
})

test('默认 calendar=events：模型判为 event（要到场、有时间）进日历，task 只进待办；每封邮件的判断写进报告', async () => {
  const created = []
  const llm = llmFrom({
    电信: { v: 1, actionable: true, items: [
      { key: 'ctg-confirm', kind: 'task', title: '中国电信：确认参加笔试', dueDate: '2026-11-13', dueTime: '18:00', priority: 'high', prep: '', quote: '' },
      { key: 'ctg-exam', kind: 'event', title: '中国电信：线上笔试', dueDate: '2026-11-14', dueTime: '09:00', durationMinutes: 120, priority: 'high', prep: '', quote: '' },
    ] },
    周报: { v: 1, actionable: false, items: [] },
  })
  const mails = [
    { uid: 1, subject: '电信笔试安排', from: 'a@ct.cn', date: ago(2), body: '' },
    { uid: 2, subject: '团队周报', from: 'b@x.com', date: ago(1), body: '' },
    { uid: 3, subject: '您的验证码', from: 'c@x.com', date: ago(1), body: '' },
  ]
  const h = await harness({ llm, mails, config: { language: 'zh' }, extraTools: { calendar_create: (a) => { created.push(a); return { created: { uid: 'e' } } } } })
  const r = await h.planner.runOnce()
  assert.equal(r.created.length, 2)
  assert.deepEqual(created.map((c) => c.summary), ['中国电信：线上笔试'])
  const byMail = Object.fromEntries(r.decisions.map((d) => [d.subject, d.what]))
  assert.deepEqual(JSON.parse(JSON.stringify(byMail['电信笔试安排'])), [['todo', '中国电信：确认参加笔试'], ['todo+cal', '中国电信：线上笔试']])
  assert.equal(byMail['团队周报'], 'none')
  assert.equal(byMail['您的验证码'], 'noise')
  const { renderReport } = await import('../index.js')
  const text = renderReport(r, 'zh')
  assert.match(text, /电信笔试安排 — → 待办 中国电信：确认参加笔试；→ 待办 \+ 日历 中国电信：线上笔试/)
  assert.match(text, /团队周报 — 不需要处理/)
  assert.match(text, /您的验证码 — 噪音，跳过/)
  // calendar=off：一条都不进日历
  created.length = 0
  const off = await harness({ llm, mails, config: { language: 'zh', calendar: 'off' }, extraTools: { calendar_create: (a) => { created.push(a); return {} } } })
  await off.planner.runOnce()
  assert.equal(created.length, 0)
})

test('标题语言：默认跟系统语言（提示词要求翻译），可切换为保留邮件原语言；kind 缺省时按有无时间推断', async () => {
  const { extractWithModel, readReply } = await import('../lib/llm.js')
  let system = ''
  const route = { provider: 'p', model: 'm', llm: { stream: async function* (o) { system = o.system; yield { type: 'text-delta', text: '{"v":1,"actionable":false,"items":[]}' }; yield { type: 'finish', reason: { kind: 'stop' } } } } }
  const base = normalizeConfig({ language: 'en' })
  await extractWithModel(route, { uid: 1, subject: 's', body: 'b' }, base, NOW)
  assert.match(system, /title.*written in English — ALWAYS/)
  await extractWithModel(route, { uid: 1, subject: 's', body: 'b' }, normalizeConfig({ language: 'zh', titleLanguage: 'mail' }), NOW)
  assert.match(system, /written in the same language as the email/)
  assert.match(system, /prep.*written in Simplified Chinese/s)
  const r = readReply('{"v":1,"items":[{"title":"A：面试","dueDate":"2026-11-20","dueTime":"10:00"},{"title":"B：交材料","dueDate":"2026-11-20"}]}', { now: NOW, maxItems: 3 })
  assert.deepEqual(r.items.map((i) => i.kind), ['event', 'task'])
})

test('语言：DSH 偏好为「跟随系统」时落到系统语言', async () => {
  const { detectLanguage } = await import('../lib/config.js')
  assert.equal(detectLanguage({ locale: 'system', env: { LANG: 'zh_CN.UTF-8' } }), 'zh')
  assert.equal(detectLanguage({ locale: 'system', env: { LANG: 'en_US.UTF-8' } }), 'en')
  assert.equal(detectLanguage({ locale: 'en', env: { LANG: 'zh_CN.UTF-8' } }), 'en')
})

test('没装 dsh-calendar：提示只出现一次', async () => {
  const llm = llmFrom({ 面试: { v: 1, actionable: true, items: [{ key: 'k1', kind: 'event', title: 'A：面试', dueDate: '2026-11-20', dueTime: '10:00', priority: 'high', prep: '', quote: '' }] }, 笔试: { v: 1, actionable: true, items: [{ key: 'k2', kind: 'event', title: 'B：笔试', dueDate: '2026-11-21', dueTime: '09:00', priority: 'high', prep: '', quote: '' }] } })
  const mails = [{ uid: 1, subject: '面试通知', from: 'a@a.com', date: ago(1), body: '' }]
  const h = await harness({ llm, mails, config: { language: 'zh' } })
  assert.equal((await h.planner.runOnce()).notices.length, 1)
  mails.push({ uid: 2, subject: '笔试通知', from: 'b@b.com', date: NOW.toISOString(), body: '' })
  const r2 = await h.planner.runOnce()
  assert.equal(r2.created.length, 1)
  assert.equal(r2.notices.length, 0)
})

test('标题语言校验：目标英文而模型给了中文标题 → 要求重写；重写仍不对就照收', async () => {
  const { extractWithModel, titleInLanguage } = await import('../lib/llm.js')
  assert.equal(titleInLanguage('中国电信广东公司：完成校招综合测评', 'en'), false)
  assert.equal(titleInLanguage('China Telecom Guangdong: complete assessment', 'en'), true)
  assert.equal(titleInLanguage('UOB: MAP 在线测评', 'zh'), true)
  assert.equal(titleInLanguage('UOB: MAP online assessment', 'zh'), false)
  const replies = [
    '{"v":1,"items":[{"title":"中国电信广东公司：完成校招综合测评","dueDate":"2026-11-16","dueTime":"15:00","kind":"task"}]}',
    '{"v":1,"items":[{"title":"China Telecom Guangdong: complete campus assessment","dueDate":"2026-11-16","dueTime":"15:00","kind":"task"}]}',
  ]
  const prompts = []
  const route = { provider: 'p', model: 'm', llm: { stream: async function* (o) { prompts.push(o.messages[0].content[0].text); yield { type: 'text-delta', text: replies.shift() ?? replies[0] }; yield { type: 'finish', reason: { kind: 'stop' } } } } }
  const r = await extractWithModel(route, { uid: 1, subject: '邀请', body: '...' }, normalizeConfig({ language: 'en' }), NOW)
  assert.equal(r.items[0].title, 'China Telecom Guangdong: complete campus assessment')
  assert.match(prompts[1], /titles must be written in English/)
  // 一直不改：第三次照收，不丢事项
  const stubborn = { provider: 'p', model: 'm', llm: { stream: async function* () { yield { type: 'text-delta', text: '{"v":1,"items":[{"title":"中国邮政：笔试","dueDate":"2026-11-20","dueTime":"14:00"}]}' }; yield { type: 'finish', reason: { kind: 'stop' } } } } }
  const r2 = await extractWithModel(stubborn, { uid: 2, subject: 's', body: 'b' }, normalizeConfig({ language: 'en' }), NOW)
  assert.equal(r2.ok, true)
  assert.equal(r2.items[0].title, '中国邮政：笔试')
  // titleLanguage=mail 不校验
  const keep = { provider: 'p', model: 'm', llm: { stream: async function* () { yield { type: 'text-delta', text: '{"v":1,"items":[{"title":"中国邮政：笔试","dueDate":"2026-11-20"}]}' }; yield { type: 'finish', reason: { kind: 'stop' } } } } }
  assert.equal((await extractWithModel(keep, { uid: 3, subject: 's', body: 'b' }, normalizeConfig({ language: 'en', titleLanguage: 'mail' }), NOW)).items.length, 1)
})

test('多邮箱：每个邮箱各自处理、uid 互不冲突、读信带账号；OAuth 未登录的跳过；一个连不上不影响其他', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ip-multi-'))
  const store = createStore({ file: join(dir, 'todos.json') })
  const todoTool = createTool(createApi(store), store.load())
  const boxes = {
    qq: [{ uid: 1, subject: '中国电信笔试通知', from: 'hr@ct.cn', date: ago(1), body: '' }],
    gmail: [{ uid: 1, subject: 'Acme interview invitation', from: 'hr@acme.com', date: ago(1), body: '' }],
    broken: [],
  }
  const reads = []
  const tools = {
    personal_todo: (a) => todoTool.execute(a),
    email_health: () => ({ checks: [
      { name: '账号 qq', detail: 'qq / me@qq.com / IMAP imap.qq.com / SMTP smtp.qq.com' },
      { name: '账号 gmail', detail: 'gmail / me@gmail.com / IMAP imap.gmail.com / SMTP smtp.gmail.com / OAuth2 已登录（me@gmail.com）' },
      { name: '账号 outlook', detail: 'outlook / me@outlook.com / IMAP outlook.office365.com / SMTP smtp.office365.com / OAuth2 尚未登录' },
      { name: '账号 broken', detail: 'custom / me@corp.com / IMAP x / SMTP y' },
    ] }),
    email_list: ({ account }) => { if (account === 'broken') throw new Error('授权码已失效'); return { account, uidValidity: 7, messages: boxes[account].map(({ body, ...e }) => e) } },
    email_read: ({ uid, account }) => { reads.push(`${account}/${uid}`); const m = boxes[account].find((x) => x.uid === uid); return { ...m, text: m.body, to: [{ address: `me@${account}.com` }] } },
  }
  const llm = llmFrom({
    电信: { v: 1, actionable: true, items: [{ key: 'ctg', kind: 'event', title: '中国电信：线上笔试', dueDate: '2026-11-14', dueTime: '09:00', priority: 'high', prep: '', quote: '' }] },
    Acme: { v: 1, actionable: true, items: [{ key: 'acme', kind: 'event', title: 'Acme：面试', dueDate: '2026-11-18', dueTime: '10:00', priority: 'high', prep: '', quote: '' }] },
  })
  const planner = createPlanner({
    callTool: async (n, a) => tools[n](a), hasTool: (n) => n in tools,
    route: () => ({ llm, provider: 'p', model: 'm' }), store: createStateFile(join(dir, 'state.json')),
    getConfig: () => normalizeConfig({ language: 'zh', backfillDays: 3 }), clock: () => NOW,
  })
  const r = await planner.runOnce()
  assert.deepEqual([...reads].sort(), ['gmail/1', 'qq/1'])
  assert.equal(r.created.length, 2)
  assert.ok(r.notices.some((n) => /outlook/.test(n)))
  assert.ok(r.errors.some((e) => /\[broken\] 授权码已失效/.test(e)))
  assert.equal(r.ok, true)
  assert.ok(r.decisions.some((d) => d.subject.startsWith('[gmail] ')))
  const items = (await todoTool.execute({ action: 'list', view: 'open' })).items
  assert.match(items.find((x) => x.title.startsWith('Acme')).note, /#inbox-planner account=gmail uid=1/)
  // 第二轮：两个邮箱都没新邮件
  reads.length = 0
  assert.equal((await planner.runOnce()).scanned, 0)
  assert.deepEqual(reads, [])
  const st = await planner.status()
  assert.deepEqual(Object.keys(st.accounts).sort(), ['broken', 'gmail', 'qq'])
  // 只处理指定邮箱
  const only = createPlanner({
    callTool: async (n, a) => tools[n](a), hasTool: (n) => n in tools,
    route: () => ({ llm, provider: 'p', model: 'm' }), store: createStateFile(join(dir, 'state2.json')),
    getConfig: () => normalizeConfig({ language: 'zh', accounts: 'qq' }), clock: () => NOW,
  })
  reads.length = 0
  const r3 = await only.runOnce()
  assert.deepEqual(reads, ['qq/1'])
  assert.equal(r3.errors.length, 0)
})

test('旧版（单邮箱）状态文件自动迁移，水位和已处理记录保留', async () => {
  const { migrateState } = await import('../lib/planner.js')
  const v1 = { v: 1, account: 'default', uidValidity: 777, lastUid: 5392, baselineAt: '2026-11-09T00:00:00.000Z', seen: { 5390: { at: 'x' } }, keys: { a: { id: 't1' } }, events: {}, self: ['me@qq.com'], paused: false }
  const v2 = migrateState(v1)
  assert.equal(v2.v, 2)
  assert.deepEqual(v2.accounts.default, { uidValidity: 777, lastUid: 5392, baselineAt: '2026-11-09T00:00:00.000Z', seen: { 5390: { at: 'x' } }, forced: [] })
  assert.deepEqual(v2.keys, { a: { id: 't1' } })
  assert.equal('lastUid' in v2, false)
  assert.equal(migrateState(v2), v2)
})
