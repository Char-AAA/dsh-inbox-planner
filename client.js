/* dsh-inbox-planner — browser half. GENERATED from client.src.js + vendor/sidebar-todo-client.js (MIT) by scripts/build-client.mjs; do not edit. */
window.__ModuleLoader__.load({
  id: 'dsh-inbox-planner',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useMemo } = React

    const NS = 'dsh-inbox-planner'
    const KEY = 'dsh-inbox-planner#inbox-planner'
    const FIELDS = [
      {
        "key": "accounts",
        "group": "basic",
        "labelZh": "处理哪些邮箱",
        "labelEn": "Mailboxes",
        "kind": "string",
        "def": "",
        "zh": "dsh-email 里的账号名，逗号分隔；留空 = 全部邮箱",
        "en": "dsh-email account names, comma separated; empty = every mailbox"
      },
      {
        "key": "pollSeconds",
        "group": "basic",
        "labelZh": "检查间隔（秒）",
        "labelEn": "Check interval (s)",
        "kind": "number",
        "def": 60,
        "min": 0,
        "max": 86400,
        "zh": "检查新邮件的间隔（秒），0 = 关闭自动检查",
        "en": "Seconds between inbox checks; 0 disables automatic checks"
      },
      {
        "key": "backfillDays",
        "group": "basic",
        "labelZh": "首次回补天数",
        "labelEn": "First-run backfill (days)",
        "kind": "number",
        "def": 3,
        "min": 0,
        "max": 30,
        "zh": "首次启用时回补最近几天的邮件",
        "en": "Days of past mail to process on first run"
      },
      {
        "key": "category",
        "group": "basic",
        "labelZh": "待办分类",
        "labelEn": "To-do category",
        "kind": "string",
        "def": "",
        "zh": "写入待办时的分类；留空 = 首次运行时按 DSH 界面语言定为「邮件」或「Mail」，之后固定不变",
        "en": "To-do category; empty = \"邮件\" or \"Mail\" chosen once from the DSH UI language on first run, then kept"
      },
      {
        "key": "language",
        "group": "basic",
        "labelZh": "语言",
        "labelEn": "Language",
        "kind": "select",
        "def": "auto",
        "options": [
          "auto",
          "zh",
          "en"
        ],
        "zh": "待办标题、备注、报告和本页的语言；auto = 跟随 DSH 界面语言（DSH 设为跟随系统时即系统语言）",
        "en": "Language of to-do titles, notes, reports and this page; auto = the DSH UI language (the OS language when DSH follows the system)"
      },
      {
        "key": "titleLanguage",
        "group": "basic",
        "labelZh": "标题语言",
        "labelEn": "Title language",
        "kind": "select",
        "def": "system",
        "options": [
          "system",
          "mail"
        ],
        "zh": "system = 待办标题统一用上面的语言；mail = 标题保留邮件原文语言",
        "en": "system = to-do titles use the language above; mail = keep each mail's own language"
      },
      {
        "key": "engine",
        "group": "model",
        "labelZh": "引擎",
        "labelEn": "Engine",
        "kind": "select",
        "def": "auto",
        "options": [
          "auto",
          "llm",
          "rules"
        ],
        "zh": "auto = 用模型，失败退回规则；llm = 只用模型；rules = 不调模型",
        "en": "auto = model with rule fallback; llm = model only; rules = no model calls"
      },
      {
        "key": "llmProvider",
        "group": "model",
        "labelZh": "模型提供方",
        "labelEn": "Model provider",
        "kind": "string",
        "def": "",
        "zh": "模型提供方，留空 = DSH 默认模型",
        "en": "Model provider; empty = DSH default model"
      },
      {
        "key": "llmModel",
        "group": "model",
        "labelZh": "模型",
        "labelEn": "Model",
        "kind": "string",
        "def": "",
        "zh": "模型 id，留空 = DSH 默认模型",
        "en": "Model id; empty = DSH default model"
      },
      {
        "key": "maxItemsPerMail",
        "group": "rules",
        "labelZh": "每封最多几条",
        "labelEn": "Max items per mail",
        "kind": "number",
        "def": 3,
        "min": 1,
        "max": 8,
        "zh": "每封邮件最多生成几条",
        "en": "Max to-dos per mail"
      },
      {
        "key": "skipCcOnly",
        "group": "rules",
        "labelZh": "忽略仅抄送",
        "labelEn": "Ignore CC-only mail",
        "kind": "boolean",
        "def": true,
        "zh": "仅抄送给我的邮件默认不生成（除非信中点名要我做事）",
        "en": "Ignore mail where I am only on CC unless it names me for an action"
      },
      {
        "key": "selfAddresses",
        "group": "rules",
        "labelZh": "我的邮箱地址",
        "labelEn": "My addresses",
        "kind": "string",
        "def": "",
        "zh": "我的邮箱地址（逗号分隔），留空 = 自动从 dsh-email 识别",
        "en": "My addresses, comma separated; empty = detect from dsh-email"
      },
      {
        "key": "conflictMinutes",
        "group": "rules",
        "labelZh": "冲突判定（分钟）",
        "labelEn": "Clash window (min)",
        "kind": "number",
        "def": 150,
        "min": 0,
        "max": 1440,
        "zh": "同一天开始时间相差小于此分钟数视为冲突，0 = 不检测",
        "en": "Same-day items starting closer than this many minutes are flagged; 0 = off"
      },
      {
        "key": "annotateBoth",
        "group": "rules",
        "labelZh": "冲突双向标注",
        "labelEn": "Annotate both items",
        "kind": "boolean",
        "def": true,
        "zh": "冲突时也在原有那条的备注里提示",
        "en": "Also annotate the existing item on a conflict"
      },
      {
        "key": "dedupeDays",
        "group": "rules",
        "labelZh": "判重窗口（天）",
        "labelEn": "Dedupe window (days)",
        "kind": "number",
        "def": 3,
        "min": 0,
        "max": 30,
        "zh": "同机构同类事项，日期相差在几天内视为同一件",
        "en": "Same organisation + same kind within this many days counts as one task"
      },
      {
        "key": "calendar",
        "group": "calendar",
        "labelZh": "写入日历",
        "labelEn": "Add to calendar",
        "kind": "select",
        "def": "events",
        "options": [
          "events",
          "all",
          "off"
        ],
        "zh": "events = 只把有具体时间、需要到场的事（考试、面试、会议、预约）写进 dsh-calendar；all = 有日期的都写；off = 不写。未安装或未连接 dsh-calendar 时自动跳过",
        "en": "events = only things you attend at a set time (exams, interviews, meetings, appointments) go to dsh-calendar; all = every dated item; off = never. Skipped automatically when dsh-calendar is not installed or connected"
      },
      {
        "key": "eventMinutes",
        "group": "calendar",
        "labelZh": "默认事件时长（分钟）",
        "labelEn": "Default event length (min)",
        "kind": "number",
        "def": 60,
        "min": 5,
        "max": 1440,
        "zh": "日历事件默认时长（分钟），模型给出时以模型为准",
        "en": "Default calendar event length in minutes when the mail gives none"
      },
      {
        "key": "followUps",
        "group": "rules",
        "labelZh": "跟进改期和取消",
        "labelEn": "Follow reschedules and cancellations",
        "kind": "boolean",
        "def": true,
        "zh": "后来的邮件说改期或取消时，更新或关闭原来那条待办（以及日历事件）",
        "en": "When a later mail moves or cancels something, update or close the existing to-do (and its calendar event)"
      },
      {
        "key": "invites",
        "group": "rules",
        "labelZh": "读取会议邀请（.ics）",
        "labelEn": "Read calendar invitations (.ics)",
        "kind": "boolean",
        "def": true,
        "zh": "邮件带日历邀请附件时直接读取时间地点，不调用模型",
        "en": "Take time and place straight from an attached calendar invitation, without a model call"
      },
      {
        "key": "ignoreSenders",
        "group": "rules",
        "labelZh": "忽略这些发件人",
        "labelEn": "Ignore senders",
        "kind": "string",
        "def": "",
        "zh": "地址或域名片段，逗号分隔；匹配的邮件直接跳过。处理记录里点「忽略此发件人」会加在这里之外的单独名单",
        "en": "Addresses or domain fragments, comma separated; matching mail is skipped. \"Ignore sender\" in the activity log keeps its own list in addition to this"
      },
      {
        "key": "alwaysSenders",
        "group": "rules",
        "labelZh": "总是分析这些发件人",
        "labelEn": "Always analyse senders",
        "kind": "string",
        "def": "",
        "zh": "地址或域名片段，逗号分隔；这些发件人的邮件不会被当成噪音或仅抄送跳过",
        "en": "Addresses or domain fragments, comma separated; their mail is never dropped as noise or CC-only"
      },
      {
        "key": "promptExtra",
        "group": "model",
        "labelZh": "追加给模型的要求",
        "labelEn": "Extra model instructions",
        "kind": "text",
        "def": "",
        "zh": "追加给模型的要求，例如「账单类一律低优先级」",
        "en": "Extra instructions for the model, e.g. \"bills are always low priority\""
      },
      {
        "key": "extraNoise",
        "group": "rules",
        "labelZh": "额外噪音规则（正则）",
        "labelEn": "Extra noise regex",
        "kind": "string",
        "def": "",
        "zh": "额外噪音正则：主题或发件人匹配即跳过，不调模型",
        "en": "Extra noise regex on subject/sender; matches are skipped without a model call"
      },
      {
        "key": "concurrency",
        "group": "model",
        "labelZh": "并行分析数",
        "labelEn": "Parallel analyses",
        "kind": "number",
        "def": 3,
        "min": 1,
        "max": 6,
        "zh": "同时分析几封邮件（读取和模型调用并行，写入待办仍按顺序）",
        "en": "Mails analysed at once (reads and model calls run in parallel; to-dos are still written in order)"
      },
      {
        "key": "remindMinutes",
        "group": "remind",
        "labelZh": "提前提醒（分钟）",
        "labelEn": "Remind before (min)",
        "kind": "number",
        "def": 30,
        "min": 0,
        "max": 1440,
        "zh": "有具体时间的待办提前多少分钟提醒，0 = 不提醒。提醒在 DSH 窗口打开时弹出",
        "en": "Minutes before a timed to-do to remind you; 0 = off. Reminders appear while a DSH window is open"
      },
      {
        "key": "briefTime",
        "group": "remind",
        "labelZh": "每日简报时间",
        "labelEn": "Daily brief time",
        "kind": "string",
        "def": "08:30",
        "zh": "HH:mm，到点汇总今天和逾期的待办；留空 = 不发",
        "en": "HH:mm; lists today's and overdue to-dos at this time; empty = off"
      },
      {
        "key": "quietHours",
        "group": "remind",
        "labelZh": "免打扰时段",
        "labelEn": "Quiet hours",
        "kind": "string",
        "def": "22:00-08:00",
        "zh": "HH:mm-HH:mm，这段时间不弹提醒，结束后补发；留空 = 不设",
        "en": "HH:mm-HH:mm; no reminders during this window, held ones arrive when it ends; empty = none"
      },
      {
        "key": "remindStyle",
        "group": "remind",
        "labelZh": "提醒方式",
        "labelEn": "How to remind",
        "kind": "select",
        "def": "dot",
        "options": [
          "dot",
          "popup"
        ],
        "zh": "dot = 只在左侧「待办」图标右上角亮红点，打开待办后消失；popup = 窗口右下角弹提示条，并发系统通知",
        "en": "dot = only a red dot on the To-do icon in the sidebar, cleared when you open To-do; popup = a banner in the window corner plus a system notification"
      },
      {
        "key": "llmBodyChars",
        "group": "model",
        "labelZh": "正文最大字符数",
        "labelEn": "Max body characters",
        "kind": "number",
        "def": 2500,
        "min": 300,
        "max": 12000,
        "zh": "交给模型的正文最大字符数",
        "en": "Max body characters sent to the model"
      },
      {
        "key": "llmMaxTokens",
        "group": "model",
        "labelZh": "单次输出上限",
        "labelEn": "Max output tokens",
        "kind": "number",
        "def": 3000,
        "min": 300,
        "max": 16000,
        "zh": "单次模型输出上限",
        "en": "Max output tokens per model call"
      },
      {
        "key": "llmTimeoutMs",
        "group": "model",
        "labelZh": "调用超时（毫秒）",
        "labelEn": "Call timeout (ms)",
        "kind": "number",
        "def": 180000,
        "min": 10000,
        "max": 600000,
        "zh": "单次模型调用超时（毫秒）",
        "en": "Model call timeout (ms)"
      }
    ]
    const GROUPS = [{"id":"basic","zh":"基本","en":"Basics"},{"id":"rules","zh":"判定规则","en":"Rules"},{"id":"calendar","zh":"日历","en":"Calendar"},{"id":"remind","zh":"提醒","en":"Reminders"},{"id":"model","zh":"模型","en":"Model"}]

    const UI = {
      zh: {
        summary: '新邮件里需要你处理的事，自动写进带日历的待办',
        syncRow: '立即同步邮件', syncing: '正在同步…', syncFailed: '同步失败',
        syncDone: (n, m) => (n > 0 ? `新增 ${n} 条待办` : m > 0 ? `检查了 ${m} 封，没有新待办` : '没有新邮件'),
        loading: '正在读取设置…', unavailable: '宿主没有提供这一行的设置（插件未运行？）',
        readonly: '当前配置文件只读，不能在这里修改。',
        save: '保存', saving: '保存中…', saved: '已保存，立即生效', failed: '保存失败：宿主拒绝了这些值，已恢复为宿主的当前值',
        discard: '放弃修改', reset: '恢复默认', overridden: '已修改', unsaved: (n) => `${n} 项未保存`,
        on: '开', off: '关', defaultIs: (v) => `默认：${v}`, empty: '（空）',
        logTitle: '最近处理的邮件', logEmpty: '还没有处理记录', logLoading: '正在读取…', close: '关闭',
        forceCreate: '还是建一条', ignoreSender: '忽略此发件人', unignore: '恢复', ignoredHead: '已忽略的发件人',
        exportIcs: '导出 .ics（可导入手机日历）', exported: (n) => `已导出 ${n} 条`, exportNone: '没有带日期的待办可导出',
        what_noise: '噪音', what_ignored: '已忽略', what_none: '不用处理', what_cc: '仅抄送', what_dup: '已在清单', what_todo: '已建待办', 'what_todo+cal': '待办 + 日历', what_moved: '已改期', what_cancelled: '已取消', what_error: '出错',
        remindTitle: (m) => (m <= 0 ? '现在开始' : m < 60 ? `${m} 分钟后开始` : `${Math.round(m / 60)} 小时后开始`), briefTitle: '今日待办', briefBody: (today, overdue) => `今天 ${today} 件${overdue ? `，逾期 ${overdue} 件` : ''}`, dismiss: '知道了',
        opt_language_auto: '跟随系统', opt_engine_auto: '自动（模型优先，失败用规则）', opt_zh: '中文', opt_en: 'English', opt_llm: '只用模型', opt_rules: '只用规则', opt_events: '只写需要到场的事', opt_all: '有日期的都写', opt_off: '不写', opt_system: '跟随上面的语言', opt_dot: '待办图标上的红点', opt_popup: '弹出提示和系统通知', opt_mail: '保留邮件原语言',
      },
      en: {
        summary: 'Mail that needs your action becomes dated to-dos with a calendar',
        syncRow: 'Check mail now', syncing: 'Syncing…', syncFailed: 'Sync failed',
        syncDone: (n, m) => (n > 0 ? `${n} new to-do${n > 1 ? 's' : ''}` : m > 0 ? `${m} checked, nothing new` : 'No new mail'),
        loading: 'Loading settings…', unavailable: 'The host exposes no settings for this row (is the plugin running?)',
        readonly: 'The configuration file is read-only here.',
        save: 'Save', saving: 'Saving…', saved: 'Saved — applied immediately', failed: 'Not saved: the host rejected these values and its current values were restored',
        discard: 'Discard', reset: 'Reset', overridden: 'Changed', unsaved: (n) => `${n} unsaved`,
        on: 'On', off: 'Off', defaultIs: (v) => `Default: ${v}`, empty: '(empty)',
        logTitle: 'Recently processed mail', logEmpty: 'Nothing processed yet', logLoading: 'Loading…', close: 'Close',
        forceCreate: 'Make a to-do anyway', ignoreSender: 'Ignore this sender', unignore: 'Restore', ignoredHead: 'Ignored senders',
        exportIcs: 'Export .ics (import into a phone calendar)', exported: (n) => `${n} exported`, exportNone: 'No dated to-dos to export',
        what_noise: 'noise', what_ignored: 'ignored', what_none: 'nothing to do', what_cc: 'CC only', what_dup: 'already listed', what_todo: 'to-do added', 'what_todo+cal': 'to-do + calendar', what_moved: 'rescheduled', what_cancelled: 'cancelled', what_error: 'error',
        remindTitle: (m) => (m <= 0 ? 'Starting now' : m < 60 ? `Starts in ${m} min` : `Starts in ${Math.round(m / 60)} h`), briefTitle: 'Today\'s to-dos', briefBody: (today, overdue) => `${today} today${overdue ? `, ${overdue} overdue` : ''}`, dismiss: 'Got it',
        opt_language_auto: 'Follow system', opt_engine_auto: 'Auto (model, rules fallback)', opt_zh: '中文', opt_en: 'English', opt_llm: 'Model only', opt_rules: 'Rules only', opt_events: 'Only things to attend', opt_all: 'Every dated item', opt_off: 'Never', opt_system: 'Same as above', opt_dot: 'Red dot on the To-do icon', opt_popup: 'Banner and system notification', opt_mail: 'Keep mail language',
      },
    }

    function buildDict() {
      const dict = {}
      for (const lang of ['zh', 'en']) {
        const d = {}
        for (const [k, v] of Object.entries(UI[lang])) if (typeof v === 'string') d[k] = v
        for (const f of FIELDS) {
          d[`f.${f.key}`] = lang === 'zh' ? f.labelZh : f.labelEn
          d[`h.${f.key}`] = lang === 'zh' ? f.zh : f.en
        }
        for (const g of GROUPS) d[`g.${g.id}`] = g[lang]
        d.__lang = lang
        dict[lang] = d
      }
      return dict
    }

    const S = {
      page: { display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720, paddingBottom: 24 },
      group: { border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 10, padding: '4px 16px', background: 'var(--dsw-alias-bg-layer-1)' },
      groupTitle: { fontSize: 13, fontWeight: 600, color: 'var(--dsw-alias-label-secondary)', margin: '0 0 8px 2px' },
      row: { display: 'flex', gap: 16, alignItems: 'flex-start', padding: '12px 0', borderTop: '1px solid var(--dsw-alias-border-l2)' },
      rowFirst: { borderTop: 'none' },
      text: { flex: 1, minWidth: 0 },
      label: { fontSize: 14, color: 'var(--dsw-alias-label-primary)', display: 'flex', gap: 8, alignItems: 'center' },
      help: { fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)', marginTop: 4 },
      tag: { fontSize: 11, padding: '0 6px', borderRadius: 4, color: 'var(--dsw-alias-state-business-primary)', border: '1px solid var(--dsw-alias-state-business-primary)' },
      control: { flex: 'none', width: 240, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
      input: { width: '100%', boxSizing: 'border-box', height: 30, padding: '0 8px', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l3)', background: 'transparent', color: 'var(--dsw-alias-label-primary)', fontSize: 13 },
      textarea: { width: '100%', boxSizing: 'border-box', minHeight: 64, padding: 8, borderRadius: 6, border: '1px solid var(--dsw-alias-border-l3)', background: 'transparent', color: 'var(--dsw-alias-label-primary)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' },
      link: { border: 'none', background: 'none', padding: 0, fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', cursor: 'pointer', textDecoration: 'underline' },
      bar: { display: 'flex', gap: 12, alignItems: 'center', padding: '4px 0 12px' },
      primary: { height: 32, padding: '0 16px', borderRadius: 8, border: 'none', background: 'var(--dsw-alias-state-business-primary)', color: 'var(--dsw-alias-label-primary-inverted)', fontSize: 13, cursor: 'pointer' },
      secondary: { height: 32, padding: '0 14px', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l3)', background: 'transparent', color: 'var(--dsw-alias-label-primary)', fontSize: 13, cursor: 'pointer' },
      note: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' },
      error: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' },
      ok: { fontSize: 12, color: 'var(--dsw-alias-state-business-primary)' },
    }

    const own = (obj, key) => obj !== null && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key)

    /** Coerce what an input holds into the field's JSON type; invalid numbers stay as typed so the user can fix them. */
    function coerce(field, raw) {
      if (field.kind === 'number') {
        const n = Number(raw)
        return raw === '' || !Number.isFinite(n) ? raw : n
      }
      return raw
    }

    function valid(field, v) {
      if (field.kind === 'number') return typeof v === 'number' && v >= field.min && v <= field.max
      if (field.kind === 'boolean') return typeof v === 'boolean'
      if (field.kind === 'select') return field.options.includes(v)
      return typeof v === 'string'
    }

    function show(t, field, v) {
      if (field.kind === 'boolean') return v ? t('on') : t('off')
      if (field.kind === 'select') {
        for (const k of [`opt_${field.key}_${v}`, `opt_${v}`]) if (t(k) !== k) return t(k)
        return String(v)
      }
      return v === '' || v === undefined ? t('empty') : String(v)
    }

    function Control({ field, value, onChange, disabled, t }) {
      if (field.kind === 'boolean') {
        return h('label', { style: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--dsw-alias-label-secondary)' } },
          h('input', { type: 'checkbox', checked: value === true, disabled, onChange: (e) => onChange(e.target.checked), 'aria-label': t(`f.${field.key}`) }),
          value === true ? t('on') : t('off'))
      }
      if (field.kind === 'select') {
        return h('select', { style: S.input, value: String(value ?? field.def), disabled, onChange: (e) => onChange(e.target.value), 'aria-label': t(`f.${field.key}`) },
          field.options.map((o) => h('option', { key: o, value: o }, show(t, field, o))))
      }
      if (field.kind === 'text') {
        return h('textarea', { style: S.textarea, value: String(value ?? ''), disabled, onChange: (e) => onChange(e.target.value), 'aria-label': t(`f.${field.key}`) })
      }
      return h('input', {
        style: S.input,
        type: field.kind === 'number' ? 'number' : 'text',
        ...(field.kind === 'number' ? { min: field.min, max: field.max, step: 1 } : {}),
        value: value === undefined || value === null ? '' : String(value),
        disabled,
        onChange: (e) => onChange(coerce(field, e.target.value)),
        'aria-label': t(`f.${field.key}`),
      })
    }

    function SettingsPage({ form, t }) {
      const state = form?.state
      const value = state?.value ?? {}
      const user = state?.user ?? {}
      const revision = state?.revision
      const writable = state?.writable !== false
      const [draft, setDraft] = useState({})
      const [phase, setPhase] = useState({ kind: 'idle' })
      // 宿主值变了（别处保存、热更新）就丢掉与新值相同的草稿项。
      useEffect(() => {
        setDraft((d) => {
          const next = {}
          for (const [k, v] of Object.entries(d)) if (v !== value[k]) next[k] = v
          return next
        })
      }, [revision])

      const dirty = Object.keys(draft)
      const invalid = dirty.filter((k) => !valid(FIELDS.find((f) => f.key === k), draft[k]))

      if (!form || !state || state.status === 'loading') return h('div', { style: S.note }, t('loading'))
      if (state.status === 'unavailable') return h('div', { style: S.error }, t('unavailable'))

      const save = async () => {
        if (dirty.length === 0 || invalid.length > 0) return
        setPhase({ kind: 'saving' })
        const ops = dirty.map((k) => ({ op: 'set', path: [k], value: draft[k] }))
        try {
          const ok = await form.mutate(ops, revision)
          if (ok) setDraft({})
          setPhase({ kind: ok ? 'saved' : 'failed' })
        } catch (error) {
          setPhase({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
        }
      }
      const reset = async (key) => {
        setPhase({ kind: 'saving' })
        setDraft((d) => { const n = { ...d }; delete n[key]; return n })
        try {
          const ok = await form.mutate([{ op: 'unset', path: [key] }], revision)
          setPhase({ kind: ok ? 'saved' : 'failed' })
        } catch (error) {
          setPhase({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
        }
      }

      return h('div', { style: S.page, 'data-inbox-planner-settings': '' },
        !writable ? h('div', { style: S.note }, t('readonly')) : null,
        GROUPS.map((g) => h('section', { key: g.id },
          h('h3', { style: S.groupTitle }, t(`g.${g.id}`)),
          h('div', { style: S.group },
            FIELDS.filter((f) => f.group === g.id).map((f, i) => {
              const current = own(draft, f.key) ? draft[f.key] : value[f.key] ?? f.def
              const changed = own(user, f.key)
              const bad = own(draft, f.key) && !valid(f, draft[f.key])
              return h('div', { key: f.key, style: i === 0 ? { ...S.row, ...S.rowFirst } : S.row, 'data-field': f.key },
                h('div', { style: S.text },
                  h('div', { style: S.label }, t(`f.${f.key}`), changed ? h('span', { style: S.tag }, t('overridden')) : null),
                  h('div', { style: S.help }, t(`h.${f.key}`)),
                  f.kind === 'number' ? h('div', { style: bad ? S.error : S.help }, `${f.min}–${f.max} · ${t('defaultIs')(show(t, f, f.def))}`) : null),
                h('div', { style: S.control },
                  h(Control, { field: f, value: current, disabled: !writable || phase.kind === 'saving', t, onChange: (v) => { setPhase({ kind: 'idle' }); setDraft((d) => ({ ...d, [f.key]: v })) } }),
                  changed && writable ? h('button', { type: 'button', style: S.link, onClick: () => void reset(f.key) }, t('reset')) : null))
            })))),
        writable ? h('div', { style: S.bar },
          h('button', { type: 'button', style: { ...S.primary, opacity: dirty.length === 0 || invalid.length > 0 ? 0.5 : 1 }, disabled: dirty.length === 0 || invalid.length > 0 || phase.kind === 'saving', onClick: () => void save() },
            phase.kind === 'saving' ? t('saving') : t('save')),
          dirty.length > 0 ? h('button', { type: 'button', style: S.secondary, onClick: () => { setDraft({}); setPhase({ kind: 'idle' }) } }, t('discard')) : null,
          dirty.length > 0 ? h('span', { style: S.note }, t('unsaved')(dirty.length)) : null,
          phase.kind === 'saved' ? h('span', { style: S.ok }, t('saved')) : null,
          phase.kind === 'failed' ? h('span', { style: S.error }, phase.message ? `${t('failed')} (${phase.message})` : t('failed')) : null) : null)
    }

    async function callApi(method, payload) {
      const res = await fetch(new URL(`inbox-planner/api/${method}`, document.baseURI).href, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload ?? {}),
      })
      const body = await res.json().catch(() => null)
      if (!body || !body.ok) throw new Error((body && body.error) || `HTTP ${res.status}`)
      return body.result
    }

    /** Refresh icon for the To-do panel header: check mail now, then reload the list. */
    function SyncIcon({ t, onDone }) {
      const [phase, setPhase] = useState({ kind: 'idle' })
      const run = async () => {
        if (phase.kind === 'running') return
        setPhase({ kind: 'running' })
        try {
          const r = await callApi('sync')
          setPhase({ kind: r.ok ? 'done' : 'failed', created: r.created, scanned: r.scanned })
          if (typeof onDone === 'function') await onDone()
        } catch (error) {
          setPhase({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
        }
        setTimeout(() => setPhase((p) => (p.kind === 'running' ? p : { kind: 'idle' })), 4000)
      }
      const tip = phase.kind === 'running' ? t('syncing')
        : phase.kind === 'done' ? t('syncDone')(phase.created, phase.scanned)
          : phase.kind === 'failed' ? `${t('syncFailed')}${phase.message ? `: ${phase.message}` : ''}`
            : t('syncRow')
      return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
        h('button', {
          type: 'button', className: 'td-btn', title: tip, 'aria-label': tip, 'data-inbox-planner-refresh': '',
          disabled: phase.kind === 'running',
          style: { width: 28, height: 28, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 6, background: 'transparent', color: phase.kind === 'failed' ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-label-secondary)', cursor: phase.kind === 'running' ? 'default' : 'pointer' },
          onClick: () => void run(),
        }, h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
          style: phase.kind === 'running' ? { animation: 'inbox-planner-spin 0.9s linear infinite' } : undefined },
        h('path', { d: 'M13.5 8a5.5 5.5 0 1 1-1.6-3.9' }), h('path', { d: 'M13.5 2.5v3h-3' }))),
        phase.kind === 'done' || phase.kind === 'failed'
          ? h('span', { 'data-inbox-planner-refresh-result': '', style: { fontSize: 12, color: phase.kind === 'failed' ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-label-tertiary)' } }, tip)
          : null)
    }

    const ICON_BTN = { width: 28, height: 28, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 6, background: 'transparent', color: 'var(--dsw-alias-label-secondary)', cursor: 'pointer' }
    const svg = (paths) => h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, ...paths.map((d, i) => h('path', { key: i, d })))
    const stamp = (iso) => {
      const at = new Date(iso)
      if (Number.isNaN(at.getTime())) return ''
      const p = (n) => String(n).padStart(2, '0')
      return `${p(at.getMonth() + 1)}-${p(at.getDate())} ${p(at.getHours())}:${p(at.getMinutes())}`
    }
    const senderPattern = (e) => {
      const a = String(e.fromAddr || '').toLowerCase()
      return a.includes('@') ? a : ''
    }

    /** Popover listing recent per-mail decisions, with "make a to-do anyway" and "ignore sender". */
    function ActivityPanel({ t, onClose, onChanged, anchor }) {
      const [data, setData] = useState(null)
      const [busy, setBusy] = useState('')
      const [error, setError] = useState('')
      const load = async () => {
        try { setData(await callApi('activity', { limit: 40 })); setError('') } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
      }
      useEffect(() => { void load() }, [])
      useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [])
      const act = async (id, fn) => {
        setBusy(id)
        try { await fn(); await load(); if (typeof onChanged === 'function') await onChanged() } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
        setBusy('')
      }
      // Fixed to the viewport next to the button, so a panel header with overflow:hidden cannot clip it.
      const vw = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 1024
      const width = Math.min(380, vw - 24)
      const left = anchor ? Math.max(12, Math.min(anchor.left, vw - width - 12)) : 12
      const W = { position: 'fixed', top: anchor ? anchor.bottom + 6 : 60, left, zIndex: 2147482000, width, maxHeight: 440, overflow: 'auto', padding: 12, borderRadius: 10, border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-base, #fff))', boxShadow: '0 8px 24px rgba(0,0,0,.18)', textAlign: 'left' }
      const items = data?.items ?? []
      return h('div', { style: W, role: 'dialog', 'aria-label': t('logTitle'), 'data-inbox-planner-activity': '' },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
          h('strong', { style: { fontSize: 13 } }, t('logTitle')),
          h('button', { type: 'button', style: S.link, onClick: onClose }, t('close'))),
        data?.stats && data.stats.mails > 0 ? h('div', { style: { ...S.note, marginBottom: 8 } }, `${data.stats.mails} · +${data.stats.created} · 🔁${data.stats.moved} · ❌${data.stats.cancelled} · LLM ${data.stats.llmCalls}${data.stats.llmCalls ? ` (${(data.stats.llmMs / data.stats.llmCalls / 1000).toFixed(1)}s)` : ''} · ♻${data.stats.cacheHits} · 📅${data.stats.invites}`) : null,
        error ? h('div', { style: S.error }, error) : null,
        data === null && !error ? h('div', { style: S.note }, t('logLoading')) : null,
        data !== null && items.length === 0 ? h('div', { style: S.note }, t('logEmpty')) : null,
        items.map((e, i) => {
          const id = `${e.account || ''}/${e.uid}/${i}`
          const skipped = ['noise', 'ignored', 'none', 'cc', 'error'].includes(e.what)
          const pattern = senderPattern(e)
          return h('div', { key: id, style: { padding: '8px 0', borderTop: i ? '1px solid var(--dsw-alias-border-l2)' : 'none' }, 'data-activity-row': e.what },
            h('div', { style: { fontSize: 13, color: 'var(--dsw-alias-label-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: e.subject }, e.subject || '—'),
            h('div', { style: S.note }, `${stamp(e.at)} · ${e.from || ''}${e.account ? ` · ${e.account}` : ''} · ${t(`what_${e.what}`)}`),
            Array.isArray(e.items) && e.items.length ? h('div', { style: { ...S.note, color: 'var(--dsw-alias-label-secondary)' } }, e.items.map((x) => x.title).join(' · ')) : null,
            h('div', { style: { display: 'flex', gap: 12, marginTop: 4 } },
              skipped ? h('button', { type: 'button', style: S.link, disabled: busy !== '', 'data-force': '', onClick: () => void act(id, () => callApi('rescan', { uid: e.uid, account: e.account || undefined, force: true })) }, busy === id ? '…' : t('forceCreate')) : null,
              pattern && e.what !== 'ignored' ? h('button', { type: 'button', style: S.link, disabled: busy !== '', 'data-ignore': '', onClick: () => void act(`${id}/i`, () => callApi('sender', { pattern, ignore: true })) }, t('ignoreSender')) : null))
        }),
        data && data.ignored && data.ignored.length ? h('div', { style: { marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--dsw-alias-border-l2)' } },
          h('div', { style: { ...S.note, marginBottom: 4 } }, t('ignoredHead')),
          data.ignored.map((p) => h('div', { key: p, style: { display: 'flex', justifyContent: 'space-between', fontSize: 12 } },
            h('span', null, p),
            h('button', { type: 'button', style: S.link, disabled: busy !== '', onClick: () => void act(`u/${p}`, () => callApi('sender', { pattern: p, ignore: false })) }, t('unignore'))))) : null)
    }

    async function exportIcs(t) {
      const r = await callApi('export')
      if (!r.count) return t('exportNone')
      const url = URL.createObjectURL(new Blob([r.ics], { type: 'text/calendar;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = r.filename || 'inbox-planner.ics'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      return t('exported')(r.count)
    }

    /** To-do panel header: refresh, activity log, export. */
    function HeaderTools({ t, onDone }) {
      const [open, setOpen] = useState(null)
      const [msg, setMsg] = useState('')
      // The To-do page is on screen: clear the dot and keep it off while the page stays open.
      useEffect(() => {
        badge.set(false)
        badge.viewing += 1
        return () => { badge.viewing = Math.max(0, badge.viewing - 1) }
      }, [])
      const run = async () => {
        try { setMsg(await exportIcs(t)) } catch (e) { setMsg(e instanceof Error ? e.message : String(e)) }
        setTimeout(() => setMsg(''), 4000)
      }
      return h('span', { style: { position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 2 } },
        h(SyncIcon, { t, onDone }),
        h('button', { type: 'button', className: 'td-btn', style: ICON_BTN, title: t('logTitle'), 'aria-label': t('logTitle'), 'aria-expanded': Boolean(open), 'data-inbox-planner-log': '',
          onClick: (e) => { const r = e.currentTarget.getBoundingClientRect(); setOpen((v) => (v ? null : { left: r.left, right: r.right, bottom: r.bottom })) } },
          svg(['M3 3.5h10', 'M3 8h10', 'M3 12.5h6'])),
        h('button', { type: 'button', className: 'td-btn', style: ICON_BTN, title: t('exportIcs'), 'aria-label': t('exportIcs'), 'data-inbox-planner-export': '', onClick: () => void run() },
          svg(['M8 2.5v7.5', 'M5 7l3 3 3-3', 'M3 12.5v1h10v-1'])),
        msg ? h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' } }, msg) : null,
        open ? h(ActivityPanel, { t, anchor: open, onClose: () => setOpen(null), onChanged: onDone }) : null)
    }

    // ---------------- Reminders: timed to-dos, a daily brief, quiet hours ----------------
    const FIRED_KEY = 'dsh-inbox-planner:fired'
    function loadFired() {
      try { return JSON.parse(window.localStorage.getItem(FIRED_KEY) || '{}') || {} } catch { return {} }
    }
    function saveFired(map) {
      const cutoff = Date.now() - 4 * 86400000
      const kept = {}
      for (const [k, v] of Object.entries(map)) if (v > cutoff) kept[k] = v
      try { window.localStorage.setItem(FIRED_KEY, JSON.stringify(kept)) } catch { /* storage unavailable: in-memory only */ }
      return kept
    }
    const minutesOf = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
    /** True when `now` falls in "HH:mm-HH:mm" (may wrap midnight). */
    function inQuiet(now, spec) {
      const m = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(spec || '')
      if (!m) return false
      const cur = now.getHours() * 60 + now.getMinutes()
      const a = minutesOf(m[1])
      const b = minutesOf(m[2])
      return a <= b ? cur >= a && cur < b : cur >= a || cur < b
    }
    const dayOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    /** Pure decision for one tick: which reminders are due now. Exported for tests via __inboxBridge. */
    function dueReminders(todos, cfg, now, fired) {
      const out = []
      if (inQuiet(now, cfg.quietHours)) return out
      const today = dayOf(now)
      const open = todos.filter((x) => x && !x.done && !x.completedAt && !x.repeat && x.dueDate)
      if (cfg.remindMinutes > 0) {
        for (const x of open) {
          if (!x.dueTime || x.dueDate < today) continue
          const [y, mo, d] = x.dueDate.split('-').map(Number)
          const due = new Date(y, mo - 1, d, Number(x.dueTime.slice(0, 2)), Number(x.dueTime.slice(3, 5)))
          const key = `${x.id}@${x.dueDate} ${x.dueTime}`
          const lead = (due - now) / 60000
          if (fired[key] || lead > cfg.remindMinutes || lead < -60) continue
          out.push({ key, kind: 'remind', title: x.title, minutes: Math.max(0, Math.round(lead)), time: x.dueTime })
        }
      }
      if (cfg.briefTime && now.getHours() * 60 + now.getMinutes() >= minutesOf(cfg.briefTime) && !fired[`brief@${today}`]) {
        const todayItems = open.filter((x) => x.dueDate === today)
        const overdue = open.filter((x) => x.dueDate < today)
        out.push({ key: `brief@${today}`, kind: 'brief', today: todayItems.length, overdue: overdue.length, titles: [...overdue, ...todayItems].slice(0, 6).map((x) => `${x.dueTime ? `${x.dueTime} ` : ''}${x.title}`), silent: todayItems.length + overdue.length === 0 })
      }
      return out
    }

    function toastHost() {
      let host = document.querySelector('[data-inbox-planner-toasts]')
      if (!host) {
        host = document.createElement('div')
        host.setAttribute('data-inbox-planner-toasts', '')
        Object.assign(host.style, { position: 'fixed', right: '16px', bottom: '16px', zIndex: 2147483000, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '340px', pointerEvents: 'none' })
        document.body.appendChild(host)
      }
      return host
    }
    function showToast(title, body, dismissLabel, ms) {
      const el = document.createElement('div')
      el.setAttribute('role', 'status')
      Object.assign(el.style, { pointerEvents: 'auto', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--dsw-alias-border-l2, #ddd)', background: 'var(--dsw-alias-bg-layer-1, #fff)', color: 'var(--dsw-alias-label-primary, #111)', boxShadow: '0 8px 24px rgba(0,0,0,.18)', fontSize: '13px', lineHeight: '18px' })
      const head = document.createElement('div')
      head.style.fontWeight = '600'
      head.textContent = title
      const text = document.createElement('div')
      text.style.whiteSpace = 'pre-line'
      text.style.color = 'var(--dsw-alias-label-secondary, #555)'
      text.textContent = body
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = dismissLabel
      Object.assign(btn.style, { marginTop: '6px', border: 'none', background: 'none', padding: '0', fontSize: '12px', color: 'var(--dsw-alias-state-business-primary, #2563eb)', cursor: 'pointer' })
      btn.onclick = () => el.remove()
      el.append(head, text, btn)
      toastHost().appendChild(el)
      if (ms > 0) setTimeout(() => el.remove(), ms)
      return el
    }
    function systemNotify(title, body, tag) {
      try {
        if (typeof Notification === 'undefined') return
        if (Notification.permission === 'granted') { new Notification(title, { body, tag }); return }
        if (Notification.permission === 'default' && !window.__inboxPlannerAsked) {
          window.__inboxPlannerAsked = true
          void Notification.requestPermission().then((p) => { if (p === 'granted') new Notification(title, { body, tag }) }).catch(() => {})
        }
      } catch { /* not allowed in this context */ }
    }

    async function listTodos() {
      for (const path of ['inbox-planner/todo/api/list', 'todo/api/list']) {
        try {
          const res = await fetch(new URL(path, document.baseURI).href, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ view: 'open' }) })
          if (!res.ok) continue
          const body = await res.json()
          if (body && body.ok && Array.isArray(body.result?.items)) return body.result.items
        } catch { /* try the next route */ }
      }
      return null
    }

    // ---- Red dot on the sidebar To-do icon: set by a due reminder, cleared when the To-do page is open ----
    const BADGE_KEY = 'dsh-inbox-planner:badge'
    const badge = {
      on: (() => { try { return window.localStorage.getItem(BADGE_KEY) === '1' } catch { return false } })(),
      subs: new Set(),
      viewing: 0,
      set(v) {
        const next = Boolean(v) && this.viewing === 0
        if (next === this.on) return
        this.on = next
        try { window.localStorage.setItem(BADGE_KEY, next ? '1' : '0') } catch { /* in-memory only */ }
        for (const f of this.subs) f(next)
      },
    }

    /** Wraps the sidebar To-do icon and draws the dot at its top-right corner. */
    function BadgedIcon({ children }) {
      const [on, setOn] = useState(badge.on)
      useEffect(() => { badge.subs.add(setOn); setOn(badge.on); return () => { badge.subs.delete(setOn) } }, [])
      return h('span', { style: { position: 'relative', display: 'inline-flex' }, 'data-inbox-planner-badge': on ? 'on' : 'off' },
        children,
        on ? h('span', { 'aria-hidden': true, style: { position: 'absolute', top: -2, right: -3, width: 7, height: 7, borderRadius: '50%', background: 'var(--dsw-alias-state-error-primary, #e5484d)', boxShadow: '0 0 0 1.5px var(--dsw-alias-bg-base, #fff)' } }) : null)
    }

    function startReminders(t) {
      let cfg = null
      let cfgAt = 0
      let fired = loadFired()
      let stopped = false
      const tick = async () => {
        if (stopped) return
        try {
          if (!cfg || Date.now() - cfgAt > 5 * 60000) { cfg = await callApi('client'); cfgAt = Date.now() }
          if (!cfg || (cfg.remindMinutes <= 0 && !cfg.briefTime)) return
          const todos = await listTodos()
          if (!todos) return
          fired = { ...loadFired(), ...fired }
          for (const r of dueReminders(todos, cfg, new Date(), fired)) {
            fired[r.key] = Date.now()
            if (r.kind === 'brief' && r.silent) continue
            if (cfg.remindStyle !== 'popup') { badge.set(true); continue }
            const title = r.kind === 'brief' ? t('briefTitle') : `${r.time} · ${t('remindTitle')(r.minutes)}`
            const body = r.kind === 'brief' ? `${t('briefBody')(r.today, r.overdue)}\n${r.titles.join('\n')}` : r.title
            showToast(title, body, t('dismiss'), r.kind === 'brief' ? 60000 : 0)
            systemNotify(title, body, r.key)
          }
          fired = saveFired(fired)
        } catch { /* host busy or restarting: try again next tick */ }
      }
      const first = setTimeout(() => void tick(), 8000)
      const timer = setInterval(() => void tick(), 30000)
      return () => { stopped = true; clearTimeout(first); clearInterval(timer) }
    }

    function ensureSpinStyle() {
      if (typeof document === 'undefined' || document.querySelector('style[data-plugin-css="dsh-inbox-planner"]')) return () => {}
      const el = document.createElement('style')
      el.dataset.pluginCss = 'dsh-inbox-planner'
      el.textContent = '@keyframes inbox-planner-spin { to { transform: rotate(360deg) } }'
      document.head.appendChild(el)
      return () => el.remove()
    }

    // The To-do + calendar panel (adapted from dsh-sidebar-todo, MIT); see scripts/build-client.mjs.
    const __inboxBridge = { SyncIcon: null, t: null, BadgedIcon, dueReminders, inQuiet }
    const __todoModule = ({
      factory(require) {
        const React = require('react')
        const h = React.createElement
        const { useState, useEffect, useCallback, useRef } = React
    
        const NS = 'dsh-inbox-planner-todo'
        const dict = {
          zh: {
            nav: '待办', title: '待办', new: '新建', search: '搜索待办',
            today: '今天', overdue: '逾期', tomorrow: '明天', week: '本周', month: '本月', later: '以后', stale: '积压',
            unplanned: '未排期', done: '已完成', doneEmpty: '该范围内没有完成记录', empty: '还没有待办',
            staleHint: '超过 {n} 天未完成', loading: '加载中…', failed: '读取失败',
            actionFailed: '操作失败，请重试',
            retry: '重试', pickOne: '选一条看详情，或在下方记一条便利贴', quickNote: '便利贴', todo: '待办', filter: '筛选', all: '全部', filterEmpty: '该筛选下没有待办',
            noteAddPlaceholder: '记一点… 回车即存', noteEmpty: '一想起来就写一条',
            noteEditTitle: '点击编辑', noteDeleteTitle: '删除这条便签', toTodo: '转为待办',
            justNow: '刚刚', minutesAgo: '{n} 分钟前', hoursAgo: '{n} 小时前',
            listView: '列表', calendarView: '日历', prevMonth: '上个月', nextMonth: '下个月',
            nothingThatDay: '这一天没有安排', plansOnDay: (date) => `${date} 的安排`, newOnThatDay: '在这一天新建',
            corruptNotice: '数据文件损坏，已备份并以空清单启动',
            writeNotice: '有改动尚未写入磁盘', retryWrite: '重试写入',
            save: '保存', cancel: '取消',
            complete: '完成', reopen: '撤销完成', remove: '删除', confirmRemove: '确认删除', edit: '编辑',
            needsReview: '待确认', confirmDone: '确认已完成',
            note: '备注', priority: '优先级', dueDate: '截止日期', dueTime: '时间',
            pickDate: '选择日期', pickTime: '选择时间', clearValue: '清除',
            hourShort: '时', minuteShort: '分',
            tomorrowQuick: '明天', nextMonday: '下周一',
            category: '分类', noCategory: '无分类', categoryManage: '管理分类', categoryEmpty: '暂无分类',
            categoryCount: (count) => `${count} 条`,
            categoryHint: '分类不是预先设定的：它来自待办里填写的分类名，某条待办写了新名字，这里就会多一个。删掉一个分类，会让它的待办回到「无分类」。',
            rename: '重命名', deleteOne: '删除', confirmDelete: '确认删除',
            saveRename: '保存', cancelRename: '取消',
            dialogNew: '新建待办', dialogEdit: '编辑待办',
            fieldTitle: '标题', fieldNote: '备注', fieldDate: '日期', fieldTime: '时间',
            fieldPriority: '优先级', fieldCategory: '分类',
            fieldRepeat: '重复', repeatNone: '不循环', repeatDaily: '每天', repeatWeekly: '每周', repeatMonthly: '每月',
            fieldWeekdays: '星期', fieldMonthDay: '每月几号', fieldUntil: '结束日期',
            weekdaysRequired: '每周至少选一天',
            mon: '一', tue: '二', wed: '三', thu: '四', fri: '五', sat: '六', sun: '日',
            repeatBadge: '循环',
            completeOccurrence: '完成本次', lastCompleted: '上次完成', neverCompleted: '尚未完成过',
            completedTimes: '已完成 {n} 次', seriesEnded: '循环已结束', endedGroup: '已结束', endedBadge: '已结束',
            completedOn: '完成于', recurringDoneSection: '循环任务完成',
            quickFill: '一句话填写，例如：明天下午3点 交周报 #工作',
            quickHint: '也可以只填标题，之后在对话里让我改日期。', titleRequired: '标题不能为空',
            emptyHint: '新建第一条',
            yesterday: '昨天', earlier: '更早', created: '创建于',
            noMatch: '没有匹配的待办', staleFor: '挂了 {n} 天',
            priorityHigh: '高', priorityMedium: '中', priorityLow: '低',
            badResponse: '响应格式不正确', requestFailed: '请求失败', dismiss: '关闭',
          },
          en: {
            nav: 'To-do', title: 'To-do', new: 'New', search: 'Search',
            today: 'Today', overdue: 'Overdue', tomorrow: 'Tomorrow', week: 'This week', month: 'This month', later: 'Later', stale: 'Backlog',
            unplanned: 'Unscheduled', done: 'Completed', doneEmpty: 'No completions in this range', empty: 'No todos yet',
            staleHint: 'Open for more than {n} days', loading: 'Loading…', failed: 'Failed to load',
            actionFailed: 'Action failed, please retry',
            retry: 'Retry', pickOne: 'Select an item for details, or jot a sticky note below', quickNote: 'Sticky notes', todo: 'To-do', filter: 'Filter', all: 'All', filterEmpty: 'No todos under this filter',
            noteAddPlaceholder: 'Jot… Enter to save', noteEmpty: 'Write a thought when it comes',
            noteEditTitle: 'Click to edit', noteDeleteTitle: 'Delete this note', toTodo: 'Turn into todo',
            justNow: 'Just now', minutesAgo: '{n}m ago', hoursAgo: '{n}h ago',
            listView: 'List', calendarView: 'Calendar', prevMonth: 'Previous month', nextMonth: 'Next month',
            nothingThatDay: 'Nothing planned for this day', plansOnDay: (date) => `Plans on ${date}`, newOnThatDay: 'New on this day',
            corruptNotice: 'Data file was corrupt; it is backed up and the list started empty.',
            writeNotice: 'Some changes are not on disk yet', retryWrite: 'Retry write',
            save: 'Save', cancel: 'Cancel',
            complete: 'Complete', reopen: 'Reopen', remove: 'Delete', confirmRemove: 'Confirm delete', edit: 'Edit',
            needsReview: 'Needs review', confirmDone: 'Confirm done',
            note: 'Note', priority: 'Priority', dueDate: 'Due date', dueTime: 'Time',
            pickDate: 'Pick a date', pickTime: 'Pick a time', clearValue: 'Clear',
            hourShort: 'Hr', minuteShort: 'Min',
            tomorrowQuick: 'Tomorrow', nextMonday: 'Next Monday',
            category: 'Category', noCategory: 'No category', categoryManage: 'Manage categories', categoryEmpty: 'No categories',
            categoryCount: (count) => `${count} ${count === 1 ? 'item' : 'items'}`,
            categoryHint: 'Categories are not predefined: they come from the category names entered on todos, so a new name adds one here. Deleting a category moves its todos back to "No category".',
            rename: 'Rename', deleteOne: 'Delete', confirmDelete: 'Confirm delete',
            saveRename: 'Save', cancelRename: 'Cancel',
            dialogNew: 'New todo', dialogEdit: 'Edit todo',
            fieldTitle: 'Title', fieldNote: 'Note', fieldDate: 'Date', fieldTime: 'Time',
            fieldPriority: 'Priority', fieldCategory: 'Category',
            fieldRepeat: 'Repeat', repeatNone: 'Never', repeatDaily: 'Daily', repeatWeekly: 'Weekly', repeatMonthly: 'Monthly',
            fieldWeekdays: 'Weekdays', fieldMonthDay: 'Day of month', fieldUntil: 'Until',
            weekdaysRequired: 'Pick at least one weekday',
            mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
            repeatBadge: 'Repeats',
            completeOccurrence: 'Complete this one', lastCompleted: 'Last completed', neverCompleted: 'Never completed',
            completedTimes: 'Completed {n} times', seriesEnded: 'Series ended', endedGroup: 'Ended', endedBadge: 'Ended',
            completedOn: 'Completed on', recurringDoneSection: 'Recurring completions',
            quickFill: 'Quick fill, e.g. "tomorrow 3pm report #work"',
            quickHint: 'You can fill in just the title and ask me in chat to set the date later.', titleRequired: 'Title is required',
            emptyHint: 'Create the first one',
            yesterday: 'Yesterday', earlier: 'Earlier', created: 'Created',
            noMatch: 'No matching todos', staleFor: 'Open {n} days',
            priorityHigh: 'High', priorityMedium: 'Medium', priorityLow: 'Low',
            badResponse: 'Unexpected response', requestFailed: 'Request failed', dismiss: 'Dismiss',
          },
        }
        const ORDER = ['overdue', 'today', 'tomorrow', 'week', 'later', 'stale', 'unplanned', 'ended', 'done']
    
        function apiUrl(method) {
          return new URL(`inbox-planner/todo/api/${method}`, document.baseURI).href
        }
    
        const defaultT = (key) => dict.zh[key] ?? key
    
        async function fetchApi(method, payload, t = defaultT) {
          const res = await fetch(apiUrl(method), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload ?? {}),
          })
          const body = await res.json().catch(() => null)
          if (!body) {
            const err = new Error(t('badResponse')); err.code = 'bad-response'; err.status = res.status; throw err
          }
          if (!body.ok) {
            const err = new Error(body.error?.message ?? t('requestFailed'))
            err.code = body.error?.code; err.status = res.status; throw err
          }
          return body.result
        }
    
        const S = {
          page: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, color: 'var(--dsw-alias-label-primary)' },
          head: { display: 'flex', alignItems: 'center', gap: 10, height: 56, padding: '0 20px', flex: 'none', borderBottom: '0.5px solid var(--dsw-alias-border-l2)' },
          h1: { fontSize: 17, fontWeight: 600, margin: 0 },
          count: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' },
          grow: { flex: 1 },
          search: { width: 200, height: 32, padding: '0 10px', borderRadius: 8, fontSize: 12.5, background: 'var(--dsw-alias-bg-module-platform)', color: 'var(--dsw-alias-label-primary)' },
          body: { display: 'flex', flex: 1, minHeight: 0, width: '100%' },
          list: { flex: 1, minWidth: 0, overflowY: 'auto', padding: '10px 8px 10px 12px' },
          sec: { display: 'flex', alignItems: 'center', gap: 8, height: 30, padding: '0 8px', marginTop: 6 },
          secT: { fontSize: 12, fontWeight: 600, color: 'var(--dsw-alias-label-secondary)' },
          secN: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' },
          line: { flex: 1, height: '0.5px', background: 'var(--dsw-alias-border-l2)' },
          row: { display: 'flex', alignItems: 'center', gap: 9, height: 34, padding: '0 8px', borderRadius: 6, cursor: 'pointer' },
          cb: { width: 14, height: 14, borderRadius: 4, border: '0.5px solid var(--dsw-alias-border-l4)', flex: 'none', background: 'var(--dsw-alias-bg-layer-1)' },
          cbDone: { width: 14, height: 14, borderRadius: 4, flex: 'none', background: 'var(--dsw-alias-state-business-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
          // 14×14 的方块太小，点在边缘会落到整行上（表现为“勾了没反应”）。
          // 外层热区用 6px padding 扩到约 26×26，再用 -6px margin 把布局占位收回 14px；
          // 不设 background，视觉仍是原来的小方块。
          cbHit: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 6, margin: -6, flex: 'none', cursor: 'pointer' },
          nm: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13.5 },
          nmDone: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13.5, color: 'var(--dsw-alias-label-tertiary)', textDecoration: 'line-through' },
          tag: { fontSize: 10.5, padding: '0 6px', borderRadius: 4, color: 'var(--dsw-alias-label-secondary)', background: 'var(--dsw-alias-bg-module-platform)', flex: 'none' },
          repeatBadge: { fontSize: 12, lineHeight: '18px', padding: '0 6px', borderRadius: 4, color: 'var(--dsw-alias-label-secondary)', background: 'var(--dsw-alias-bg-module-platform)', flex: 'none' },
          due: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)', flex: 'none', minWidth: 52, textAlign: 'right' },
          dueLate: { fontSize: 11, color: 'var(--dsw-alias-state-error-primary)', flex: 'none', minWidth: 52, textAlign: 'right' },
          rightCol: { flex: 1, minWidth: 320, maxWidth: 520, display: 'flex', flexDirection: 'column', minHeight: 0, borderLeft: '0.5px solid var(--dsw-alias-border-l2)' },
          detail: { flex: 1, minWidth: 0, overflowY: 'auto', padding: 16, fontSize: 12.5, color: 'var(--dsw-alias-label-secondary)' },
          detailEmpty: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--dsw-alias-label-tertiary)', textAlign: 'center', padding: '0 20px' },
          dock: { flex: 'none', height: '50%', display: 'flex', flexDirection: 'column', borderTop: '0.5px solid var(--dsw-alias-border-l2)' },
          dockHead: { flex: 'none', display: 'flex', alignItems: 'center', gap: 8, height: 30, padding: '0 14px', color: 'var(--dsw-alias-label-secondary)' },
          dockTitle: { fontSize: 12, fontWeight: 600 },
          dockCount: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' },
          dockBody: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 12px 10px' },
          empty: { padding: 40, textAlign: 'center', color: 'var(--dsw-alias-label-tertiary)', fontSize: 13 },
          error: { margin: 12, padding: '8px 12px', borderRadius: 8, fontSize: 12, color: 'var(--dsw-alias-state-error-primary)', background: 'color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent)' },
          warn: { margin: 12, padding: '8px 12px', borderRadius: 8, fontSize: 12, color: 'var(--dsw-alias-state-warn-primary)', background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, transparent)', display: 'flex', alignItems: 'center', gap: 8 },
          addBtn: { height: 32, padding: '0 12px', borderRadius: 8, border: '0.5px solid var(--dsw-alias-border-l3)', color: 'var(--dsw-alias-label-primary)', fontSize: 13, cursor: 'pointer' },
          // 页头筛选按钮与 addBtn 同族（32 高、0.5px 边框）；flex 让条件摘要能省略号截断、× 固定右侧。
          filterBtn: { height: 32, padding: '0 10px', borderRadius: 8, border: '0.5px solid var(--dsw-alias-border-l3)', color: 'var(--dsw-alias-label-primary)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 },
          overlay: { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dsw-alias-bg-mask-1)' },
          dialog: { width: 560, maxWidth: 'calc(100vw - 32px)', maxHeight: '82vh', overflowY: 'auto', boxSizing: 'border-box', padding: '22px 24px 18px', background: 'var(--dsw-specific-input-major)', borderRadius: 'var(--dsw-radius-xl)', boxShadow: 'var(--dsw-elevation-panel)', color: 'var(--dsw-alias-label-primary)' },
          dialogHead: { fontSize: 15, fontWeight: 600, marginBottom: 12 },
          hint: { marginTop: 6, fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' },
          field: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, marginBottom: 10 },
          fieldRow: { display: 'flex', gap: 12 },
          fieldLabel: { fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)' },
          input: { width: '100%', height: 32, boxSizing: 'border-box', padding: '0 10px', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', fontSize: 12.5, fontFamily: 'inherit' },
          textarea: { width: '100%', height: 64, boxSizing: 'border-box', padding: '7px 10px', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', fontSize: 12.5, fontFamily: 'inherit', lineHeight: '18px', resize: 'vertical' },
          seg: { display: 'flex', gap: 6 },
          segItem: { flex: 1, height: 30, borderRadius: 6, border: '0.5px solid var(--dsw-alias-border-l3)', color: 'var(--dsw-alias-label-secondary)', fontSize: 12.5, cursor: 'pointer' },
          segItemOn: { border: '0.5px solid transparent', background: 'var(--dsw-alias-state-business-primary)', color: 'var(--dsw-alias-label-primary-inverted)' },
          dialogError: { marginTop: 4, padding: '6px 10px', borderRadius: 6, fontSize: 12, color: 'var(--dsw-alias-state-error-primary)', background: 'color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent)' },
          dialogFoot: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
          btnGhost: { height: 32, padding: '0 14px', borderRadius: 8, border: '0.5px solid var(--dsw-alias-border-l3)', color: 'var(--dsw-alias-label-secondary)', fontSize: 12.5, cursor: 'pointer' },
          btnPrimary: { height: 32, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--dsw-alias-state-business-primary)', color: 'var(--dsw-alias-label-primary-inverted)', fontSize: 12.5, cursor: 'pointer' },
          noticeClose: { flex: 'none', width: 20, height: 20, padding: 0, lineHeight: '18px', textAlign: 'center', border: 'none', borderRadius: 4, color: 'inherit', fontSize: 14, cursor: 'pointer' },
          // 「已完成」标题行：标题 + 计数是折叠开关，右侧是范围分段控件，末尾箭头同样可折叠。
          doneHead: { display: 'flex', alignItems: 'center', gap: 8, height: 30, padding: '0 8px', marginTop: 6 },
          doneToggle: { display: 'flex', alignItems: 'center', gap: 8, flex: 'none', minWidth: 0, padding: 0, border: 'none', color: 'inherit', cursor: 'pointer', textAlign: 'left' },
          doneRange: { display: 'flex', alignItems: 'center', gap: 4, flex: 'none' },
          doneRangeItem: { height: 22, padding: '0 7px', borderRadius: 5, border: '0.5px solid var(--dsw-alias-border-l3)', color: 'var(--dsw-alias-label-secondary)', fontSize: 11.5, lineHeight: '20px', cursor: 'pointer' },
          doneRangeItemOn: { border: '0.5px solid transparent', background: 'var(--dsw-alias-state-business-primary)', color: 'var(--dsw-alias-label-primary-inverted)' },
          doneArrow: { flex: 'none', padding: '0 2px', border: 'none', color: 'var(--dsw-alias-label-tertiary)', fontSize: 10, lineHeight: '18px', cursor: 'pointer' },
          doneEmpty: { padding: '2px 8px 4px 16px', fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' },
          subsec: { display: 'flex', alignItems: 'center', gap: 8, height: 26, padding: '0 8px 0 16px', marginTop: 2 },
          // 分类组合框：外框仍是普通 input，下拉是同一 React 树里的兄弟节点；
          // 定位交给 useAnchoredPopover（position: fixed，视口坐标），外观交给 .td-pop。
          popEmpty: { padding: '8px', fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' },
          popList: { maxHeight: 208, overflowY: 'auto' },
          popItem: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', height: 30, padding: '0 8px', border: 'none', borderRadius: 6, color: 'var(--dsw-alias-label-primary)', fontSize: 12.5, cursor: 'pointer', textAlign: 'left' },
          popCount: { marginLeft: 'auto', flex: 'none', fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' },
          popSep: { height: '0.5px', margin: 4, background: 'var(--dsw-alias-border-l2)' },
          popManage: { display: 'flex', alignItems: 'center', width: '100%', height: 30, padding: '0 8px', border: 'none', borderRadius: 6, color: 'var(--dsw-alias-state-business-primary)', fontSize: 12.5, cursor: 'pointer', textAlign: 'left' },
          // 筛选弹层的组标题；触发钮右侧的 × 小按钮（几何同 noticeClose 一族，颜色走次要标签）。
          popGroup: { padding: '4px 8px 2px', fontSize: 11, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)', textAlign: 'left' },
          filterClear: { flex: 'none', width: 16, height: 20, padding: 0, lineHeight: '18px', textAlign: 'center', border: 'none', borderRadius: 4, color: 'var(--dsw-alias-label-tertiary)', fontSize: 14, cursor: 'pointer' },
          comboClear: { position: 'absolute', top: 0, right: 0, width: 30, height: 32, padding: 0, border: 'none', borderRadius: 8, color: 'var(--dsw-alias-label-tertiary)', fontSize: 14, lineHeight: '32px', textAlign: 'center', cursor: 'pointer' },
          // 分类管理弹窗的行：名称吃满剩余宽度，计数与操作靠右。
          catRow: { display: 'flex', alignItems: 'center', gap: 8, minHeight: 34, padding: '0 8px', borderRadius: 6 },
          // 「循环任务完成」子分组的行：几何与主列表行一致（34 高、9 间距、左右 8 内边距），
          // 但没有整行选中态，所以不复用带 cursor:pointer 的 S.row。
          recurringDoneRow: { display: 'flex', alignItems: 'center', gap: 9, height: 34, padding: '0 8px', borderRadius: 6 },
          // endedRow：已结束循环行（无复选框），点击选中；hover 用 .td-note-row 的公共规则。
          endedRow: { display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 8px', borderRadius: 6, cursor: 'pointer' },
          catName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 },
          catCount: { flex: 'none', minWidth: 46, textAlign: 'right', fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' },
          catAction: { flex: 'none', height: 26, padding: '0 9px', borderRadius: 6, border: '0.5px solid var(--dsw-alias-border-l3)', color: 'var(--dsw-alias-label-secondary)', fontSize: 11.5, cursor: 'pointer' },
          catSave: { flex: 'none', height: 26, padding: '0 9px', borderRadius: 6, border: 'none', background: 'var(--dsw-alias-state-business-primary)', color: 'var(--dsw-alias-label-primary-inverted)', fontSize: 11.5, cursor: 'pointer' },
          catEmpty: { padding: '18px 8px', textAlign: 'center', fontSize: 12.5, color: 'var(--dsw-alias-label-tertiary)' },
          catHint: { marginTop: 0, marginBottom: 10, fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' },
          // 日期 / 时间选择器：触发区是按钮；弹层外观在 .td-pop，固定宽度与纵向间距在 .td-picker，
          // 定位统一交给 useAnchoredPopover，这里只写触发区、弹层内部的网格与列表。
          pickerTrigger: { width: '100%', height: 32, boxSizing: 'border-box', padding: '0 10px', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)', fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left', cursor: 'pointer' },
          pickerPlaceholder: { color: 'var(--dsw-alias-label-tertiary)' },
          pickerIcon: { flex: 'none', fontSize: 10, lineHeight: 1, color: 'var(--dsw-alias-label-tertiary)' },
          pickerHead: { display: 'flex', alignItems: 'center', gap: 2, height: 28 },
          pickerTitle: { flex: 1, minWidth: 0, textAlign: 'center', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--dsw-alias-label-primary)' },
          pickerIconBtn: { flex: 'none', width: 26, height: 26, padding: 0, border: 'none', borderRadius: 6, color: 'var(--dsw-alias-label-secondary)', fontSize: 15, lineHeight: '26px', textAlign: 'center', cursor: 'pointer' },
          pickerQuick: { display: 'flex', gap: 6 },
          pickerQuickBtn: { flex: 1, minWidth: 0, height: 26, padding: 0, border: '0.5px solid var(--dsw-alias-border-l2)', borderRadius: 6, color: 'var(--dsw-alias-label-secondary)', fontSize: 12, textAlign: 'center', cursor: 'pointer' },
          pickerWeekdays: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 },
          pickerWeekday: { textAlign: 'center', fontSize: 12, lineHeight: '16px', color: 'var(--dsw-alias-label-tertiary)' },
          pickerGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 },
          pickerDay: { height: 30, padding: 0, border: 'none', borderRadius: 6, color: 'var(--dsw-alias-label-primary)', fontSize: 13, textAlign: 'center', cursor: 'pointer' },
          pickerDayToday: { boxShadow: 'inset 0 0 0 1px var(--dsw-alias-state-business-primary)' },
          pickerDayOn: { background: 'var(--dsw-alias-state-business-primary)', color: 'var(--dsw-alias-label-primary-inverted)' },
          pickerDayOff: { opacity: 0.4 },
          pickerClear: { width: '100%', height: 28, padding: 0, border: 'none', borderRadius: 6, color: 'var(--dsw-alias-label-tertiary)', fontSize: 12, cursor: 'pointer' },
          timeCols: { display: 'flex', gap: 8 },
          timeCol: { width: 80, flex: '1 1 80px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 },
          timeHead: { textAlign: 'center', fontSize: 11, lineHeight: '14px', color: 'var(--dsw-alias-label-tertiary)' },
          timeList: { minWidth: 0, maxHeight: 150, overflowY: 'auto' },
          timeItem: { width: '100%', height: 28, padding: 0, border: 'none', borderRadius: 6, color: 'var(--dsw-alias-label-primary)', fontSize: 13, textAlign: 'center', cursor: 'pointer' },
          timeItemOn: { background: 'var(--dsw-alias-state-business-primary)', color: 'var(--dsw-alias-label-primary-inverted)' },
          // 月视图日历：头部翻月 + 42 格；格子内最多两条，超出折叠成 +N。
          viewSeg: { display: 'flex', gap: 6, flex: 'none', width: 128 },
          calendar: { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px 16px' },
          calendarHead: { display: 'flex', alignItems: 'center', gap: 6, height: 32, flex: 'none' },
          calendarTitle: { flex: 1, minWidth: 0, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' },
          iconBtn: { flex: 'none', width: 28, height: 28, padding: 0, border: 'none', borderRadius: 6, color: 'var(--dsw-alias-label-secondary)', fontSize: 16, lineHeight: '28px', textAlign: 'center', cursor: 'pointer' },
          calendarWeekdays: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, flex: 'none' },
          calendarWeekday: { textAlign: 'center', fontSize: 11, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' },
          calendarGrid: { flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, minmax(0, 1fr))', gap: 4 },
          calendarCell: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2, minWidth: 0, minHeight: 0, padding: 4, borderRadius: 8, border: '0.5px solid var(--dsw-alias-border-l2)', overflow: 'hidden', boxSizing: 'border-box', textAlign: 'left', color: 'var(--dsw-alias-label-primary)', cursor: 'pointer' },
          calendarDay: { flex: 'none', fontSize: 11, lineHeight: '14px', color: 'var(--dsw-alias-label-secondary)' },
          // 今天只强调日期数字；选中才是整格底色 + 内描边，两者可叠加。
          calendarDayToday: { color: 'var(--dsw-alias-state-business-primary)', fontWeight: 600 },
          calendarCellSelected: {
            background: 'var(--dsw-alias-interactive-bg-hover)',
            boxShadow: 'inset 0 0 0 1.5px var(--dsw-alias-state-business-primary)',
          },
          calendarItem: { display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, fontSize: 10.5, lineHeight: '14px', color: 'var(--dsw-alias-label-secondary)' },
          calendarMore: { flex: 'none', paddingLeft: 9, fontSize: 10, lineHeight: '12px', color: 'var(--dsw-alias-label-tertiary)' },
          dot: { flex: 'none', width: 5, height: 5, borderRadius: 999, background: 'var(--dsw-alias-label-tertiary)' },
          // 点某天后，详情列改成当天清单；行只展示，不承担列表的选中态。
          dayRow: { display: 'flex', alignItems: 'center', gap: 8, minHeight: 30, padding: '0 4px', borderRadius: 6 },
          detailTitle: { fontSize: 15, fontWeight: 600, color: 'var(--dsw-alias-label-primary)', marginBottom: 12 },
        }
    
        // 内联 style 表达不了 :hover / :active / :focus-visible，所以全局插一份样式表。
        // .td-btn 的透明底放在这里而不是内联：内联 background 的优先级高于类选择器，
        // 幽灵按钮若保留内联 transparent，.td-btn:hover 的底色就永远不生效。
        // 同理 .td-input 的基础描边也放这里，:hover / :focus 的 border-color 才能覆盖。
        const PLUGIN_CSS = `
    .td-overlay { animation: td-fade .14s ease-out; }
    .td-dialog { animation: td-rise .16s cubic-bezier(.2,.8,.2,1); }
    @keyframes td-fade { from { opacity: 0 } to { opacity: 1 } }
    @keyframes td-rise { from { opacity: 0; transform: translateY(6px) scale(.992) } to { opacity: 1; transform: none } }
    
    .td-btn { background: transparent; transition: background-color .12s ease, border-color .12s ease, color .12s ease, transform .08s ease; }
    .td-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
    .td-btn:active:not(:disabled) { transform: scale(.985); }
    .td-btn:focus { outline: none; }
    .td-btn:focus-visible { outline: none; box-shadow: inset 0 0 0 1.5px var(--dsw-alias-state-business-primary); }
    .td-btn:disabled { opacity: .5; cursor: default; }
    
    .td-elevated { background: var(--dsw-alias-button-elevated-fill); }
    
    .td-primary { transition: filter .12s ease, transform .08s ease, opacity .12s ease; }
    .td-primary:hover:not(:disabled) { filter: brightness(1.06); }
    .td-primary:active:not(:disabled) { transform: scale(.985); filter: brightness(.96); }
    .td-primary:focus { outline: none; }
    .td-primary:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-alias-bg-base), 0 0 0 3.5px var(--dsw-alias-state-business-primary); }
    
    .td-input { border: 0.5px solid var(--dsw-alias-border-l3); transition: border-color .12s ease, background-color .12s ease; }
    .td-input:hover { border-color: var(--dsw-alias-border-l4); }
    .td-input:focus { outline: none; border-color: var(--dsw-alias-state-business-primary); }
    .td-input:focus-visible { outline: none; }
    
    .td-row { transition: background-color .12s ease; }
    .td-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
    
    /* 日历格：选中态由内联底色 + 内描边表达，悬停只给未选中的格子一层底色。 */
    .td-cal-cell { transition: background-color .12s ease; }
    .td-cal-cell:hover { background: var(--dsw-alias-interactive-bg-hover); }
    
    /* 行标题与复选框不再带 .td-btn：行内只留 .td-row:hover 一层底色。 */
    .td-title {
      background: transparent; border: 0; padding: 0; margin: 0;
      font: inherit; color: inherit; text-align: left; cursor: pointer;
      min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .td-title:hover { background: transparent; }
    .td-title:focus { outline: none; }
    .td-title:focus-visible { outline: none; box-shadow: inset 0 -1.5px 0 var(--dsw-alias-state-business-primary); }
    
    .td-check { cursor: pointer; }
    .td-check:focus { outline: none; }
    .td-check:focus-visible { outline: none; box-shadow: 0 0 0 1.5px var(--dsw-alias-state-business-primary); }
    
    /* 自绘弹层：分类下拉、日期与时间选择器共用同一层外观与入场动画。 */
    .td-pop {
      background: var(--dsw-specific-input-major);
      border-radius: var(--dsw-radius-md);
      box-shadow: var(--dsw-elevation-panel);
      padding: 6px;
      transform-origin: top center;
      animation: td-pop-in .13s cubic-bezier(.2,.8,.2,1);
    }
    .td-pop-up { transform-origin: bottom center; animation-name: td-pop-up-in; }
    @keyframes td-pop-in { from { opacity: 0; transform: translateY(-4px) scale(.98) } to { opacity: 1; transform: none } }
    @keyframes td-pop-up-in { from { opacity: 0; transform: translateY(4px) scale(.98) } to { opacity: 1; transform: none } }
    
    /* 日期 / 时间弹层：固定宽度，纵向间距统一交给 gap。 */
    .td-picker { padding: 10px; display: flex; flex-direction: column; gap: 8px; }
    .td-picker-date { width: 272px; }
    .td-picker-time { width: 196px; }
    
    @media (prefers-reduced-motion: reduce) {
      .td-overlay, .td-dialog, .td-btn, .td-primary, .td-input, .td-row, .td-pop { animation: none; transition: none; }
      .td-btn:active:not(:disabled), .td-primary:active:not(:disabled) { transform: none; }
    }
    
    /* 便签坞：行 hover 提底色，行操作默认隐藏、hover 显出、危险操作 hover 变红。 */
    .td-note-row { }
    .td-note-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
    .td-note-row .td-note-act { opacity: 0; transition: opacity .12s ease; }
    .td-note-row:hover .td-note-act { opacity: 1; }
    .td-note-act:hover { color: var(--dsw-alias-state-error-primary); }
    
    /* 减弱动态效果时动作按钮不再淡入。注意这条要放在 .td-note-row 基础规则之后：
       同特异性按源顺序取胜，放进上面的既有复位块会被后面的规则盖掉 transition。 */
    @media (prefers-reduced-motion: reduce) {
      .td-note-row .td-note-act { transition: none; }
    }
    `
    
        /** 样式表全页只插一份；返回的清理函数交给 ctx.effect，插件卸载时移除。 */
        function ensureStyles() {
          const existing = document.querySelector('style[data-plugin-css="dsh-inbox-planner-todo"]')
          if (existing !== null) return () => {}
          const el = document.createElement('style')
          el.dataset.pluginCss = 'dsh-inbox-planner-todo'
          el.textContent = PLUGIN_CSS
          document.head.appendChild(el)
          return () => { el.remove() }
        }
    
        /** 详情列的「标签 + 值」竖排行，标签列固定 56px。 */
        function detailRow(label, value) {
          return h('div', { style: { display: 'flex', gap: 8, lineHeight: '20px' } },
            h('span', { style: { width: 56, flex: 'none', color: 'var(--dsw-alias-label-tertiary)' } }, label),
            h('span', null, value))
        }
    
        /**
         * 复选框的透明点击热区：点击挂在热区上并在热区截断冒泡，
         * 避免点偏一点就变成「选中整行」。视觉方块与键盘焦点仍在内层 role="checkbox"。
         */
        function checkHit(onClick, inner) {
          return h('span', {
            style: S.cbHit,
            onClick: (event) => {
              event.stopPropagation()
              return onClick(event)
            },
          }, inner)
        }
    
        /** 手改 JSON 可能让字符串字段变成任意类型；渲染按空串兜底，别让整页被错误边界摘掉。 */
        function asText(value) {
          return typeof value === 'string' ? value : ''
        }
    
        function dueLabel(item) {
          const dueDate = asText(item.dueDate)
          if (dueDate === '') return ''
          const dueTime = asText(item.dueTime)
          return dueTime === '' ? dueDate.slice(5) : `${dueDate.slice(5)} ${dueTime}`
        }
    
        function dateKeyOf(date) {
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        }
    
        function startOfDay(date) {
          return new Date(date.getFullYear(), date.getMonth(), date.getDate())
        }
    
        /** `YYYY-MM-DD` 解析成本地日期；格式或日历值非法时返回 null。 */
        function parseDateKey(key) {
          const text = asText(key)
          const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
          if (match === null) return null
          const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
          return dateKeyOf(date) === text ? date : null
        }
    
        /** ISO 星期：周一 = 1 … 周日 = 7；与 `monthGrid` 的周一起始保持一致。 */
        function isoWeekday(date) {
          return ((date.getDay() + 6) % 7) + 1
        }
    
        /** 把 `YYYY-MM-DD` 在本地日历上平移 `days` 天；非法键原样返回。 */
        function shiftKeyLocal(key, days) {
          const date = parseDateKey(key)
          if (date === null) return key
          return dateKeyOf(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days))
        }
    
        /** 6 周 × 7 天，周一起始；返回 42 个 `YYYY-MM-DD`，前后补邻月日期。 */
        function monthGrid(year, month) {
          const first = new Date(year, month, 1)
          const offset = (first.getDay() + 6) % 7
          const start = new Date(year, month, 1 - offset)
          const cells = []
          for (let index = 0; index < 42; index += 1) {
            cells.push(dateKeyOf(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)))
          }
          return cells
        }
    
        /** 月标题：日历与日期选择器共用，避免两处格式漂移。 */
        function monthTitle(year, month) {
          return `${year} 年 ${month + 1} 月`
        }
    
        /** `HH:mm` 拆成小时与分钟字符串；非法时间返回 null。 */
        function splitTimeKey(value) {
          const text = asText(value)
          const match = /^(\d{2}):(\d{2})$/.exec(text)
          if (match === null) return null
          if (Number(match[1]) > 23 || Number(match[2]) > 59) return null
          return { hour: match[1], minute: match[2] }
        }
    
        // 周标题不占词典键：按界面语言（今天 / Today）在两种窄标签里选一组。
        const WEEKDAY_LABELS = {
          zh: ['一', '二', '三', '四', '五', '六', '日'],
          en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
        }
        const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
        const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))
        const MONTH_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
        // ISO 1–7：周一…周日；文本走词典，别用数组，t() 只返回字符串。
        const WEEKDAY_OPTIONS = [['mon', 1], ['tue', 2], ['wed', 3], ['thu', 4], ['fri', 5], ['sat', 6], ['sun', 7]]
    
        function weekdayLabels(t) {
          return t('today') === dict.zh.today ? WEEKDAY_LABELS.zh : WEEKDAY_LABELS.en
        }
    
        /** `createdAt` 按本地时区格式化成 `YYYY-MM-DD HH:mm`。 */
        function formatDateTime(iso) {
          const at = new Date(iso)
          if (Number.isNaN(at.getTime())) return ''
          return `${dateKeyOf(at)} ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
        }
    
        /** 便签行相对时间：1 分钟内「刚刚」，1 小时内 N 分钟，1 天内 N 小时，更久退回日期键。 */
        function noteRelTime(t, iso) {
          const ts = Date.parse(iso)
          if (Number.isNaN(ts)) return ''
          const diff = Date.now() - ts
          if (diff < 60000) return t('justNow')
          if (diff < 3600000) return t('minutesAgo').replace('{n}', String(Math.floor(diff / 60000)))
          if (diff < 86400000) return t('hoursAgo').replace('{n}', String(Math.floor(diff / 3600000)))
          return dateKeyOf(new Date(ts))
        }
    
        const PRIORITY_COLOR = {
          high: 'var(--dsw-alias-state-error-primary)',
          medium: 'var(--dsw-alias-state-warn-primary)',
          low: 'var(--dsw-alias-state-business-primary)',
        }
        const PRIORITY_LABEL_KEY = {
          high: 'priorityHigh',
          medium: 'priorityMedium',
          low: 'priorityLow',
        }
    
        function priorityColor(priority) {
          return PRIORITY_COLOR[priority] ?? 'var(--dsw-alias-label-tertiary)'
        }
    
        function priorityLabel(priority, t) {
          const key = PRIORITY_LABEL_KEY[priority]
          if (key !== undefined) return t(key)
          return typeof priority === 'string' ? priority : ''
        }
    
        /** 「挂了 N 天」：按 `createdAt` 算整天数，算不出来时退回分组名。 */
        function staleLabel(item, t, now = new Date()) {
          const created = Date.parse(item.createdAt)
          if (Number.isNaN(created)) return t('stale')
          const days = Math.max(0, Math.floor((now.getTime() - created) / 86400000))
          return days > 0 ? t('staleFor').replace('{n}', String(days)) : t('stale')
        }
    
        /** 客户端按 `doneAt` 分「今天 / 昨天 / 本周 / 更早」，不改服务端契约。 */
        function doneGroupOf(item, now = new Date()) {
          if (!item.doneAt) return 'earlier'
          const at = new Date(item.doneAt)
          if (Number.isNaN(at.getTime())) return 'earlier'
          const day = startOfDay(at).getTime()
          const today = startOfDay(now)
          if (day === today.getTime()) return 'today'
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          if (day === yesterday.getTime()) return 'yesterday'
          const monday = new Date(today)
          monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
          if (day >= monday.getTime()) return 'week'
          return 'earlier'
        }
    
        /** `doneAt` → 本地日期键；旧数据没有 `doneAt`（或值非法）返回 null。 */
        function doneKeyOf(item) {
          if (!item.doneAt) return null
          const at = new Date(item.doneAt)
          if (Number.isNaN(at.getTime())) return null
          return dateKeyOf(at)
        }
    
        /** 服务端 categories 返回 `{ items: [{ name, count }] }`；脏数据按空名跳过。 */
        function normalizeCategories(result) {
          const items = result !== null && typeof result === 'object' && Array.isArray(result.items) ? result.items : []
          const rows = []
          for (const item of items) {
            if (item === null || typeof item !== 'object') continue
            const name = asText(item.name)
            if (name === '') continue
            rows.push({ name, count: Number.isInteger(item.count) ? item.count : 0 })
          }
          return rows
        }
    
        // 四个弹层（日期 / 时间 / 分类 / 页头筛选）共用同一套锚定参数：
        // 期望高度决定向下还是向上展开，宽度用于左右夹取；分类下拉跟随触发区宽度。
        const DATE_POP = { width: 272, height: 360 }
        const TIME_POP = { width: 196, height: 260 }
        const CATEGORY_POP = { width: null, height: 240 }
        // 页头筛选面板：固定 240 宽；高度给两组选择钮的常见上限，超出交内部滚动，放不下时整体夹取。
        const FILTER_POP = { width: 240, height: 280 }
        const POP_GAP = 6
        const POP_EDGE = 8
        const POP_FALLBACK_WIDTH = 240
    
        /**
         * 弹层锚定：坐标是视口坐标（position: fixed），所以弹层不再被 .td-dialog 的滚动容器裁切。
         * 打开时按触发区的 getBoundingClientRect() 量一次；打开期间监听 window 的 resize 与
         * scroll（capture: true 才能收到弹窗容器内部的滚动），触发区移动时重算。关闭时解绑监听
         * 并清空定位状态。width 传 null 表示跟随触发区宽度；onDismiss 处理点击外部关闭。
         */
        function useAnchoredPopover(open, width, height, onDismiss) {
          const anchorRef = useRef(null)
          const [placement, setPlacement] = useState(null)
    
          useEffect(() => {
            if (!open) {
              setPlacement(null)
              return undefined
            }
            const place = () => {
              const node = anchorRef.current
              const rect = node !== null && typeof node.getBoundingClientRect === 'function'
                ? node.getBoundingClientRect()
                : null
              if (rect === null) return
              const viewportWidth = Number.isFinite(window.innerWidth) ? window.innerWidth : 0
              const viewportHeight = Number.isFinite(window.innerHeight) ? window.innerHeight : 0
              if (viewportWidth <= 0 || viewportHeight <= 0) return
    
              const popWidth = typeof width === 'number'
                ? width
                : (rect.width > 0 ? rect.width : POP_FALLBACK_WIDTH)
              const below = viewportHeight - rect.bottom - POP_GAP - POP_EDGE
              // 下方放不下期望高度就翻到上方；两种情况都只给「实际可用空间」作为 maxHeight，
              // 内容超出时由弹层自己滚动。
              const up = below < height
              let top = rect.bottom + POP_GAP
              let maxHeight = Math.min(height, Math.max(0, below))
              if (up) {
                // 先按期望高度把弹层放到触发区上方，再夹到视口上边距；
                // maxHeight 取「期望高度」和「实际可用空间」的较小值。
                top = Math.max(POP_EDGE, rect.top - height - POP_GAP)
                maxHeight = Math.min(
                  height,
                  Math.max(0, rect.top - top - POP_GAP),
                  Math.max(0, viewportHeight - top - POP_EDGE),
                )
              }
              const left = Math.max(POP_EDGE, Math.min(rect.left, viewportWidth - popWidth - POP_EDGE))
    
              setPlacement((prev) => (prev !== null
                && prev.left === left && prev.top === top && prev.maxHeight === maxHeight
                && prev.up === up && prev.width === popWidth
                ? prev
                : { left, top, maxHeight, up, width: popWidth }))
            }
            place()
            window.addEventListener('resize', place)
            window.addEventListener('scroll', place, true)
            return () => {
              window.removeEventListener('resize', place)
              window.removeEventListener('scroll', place, true)
            }
          }, [open, width, height])
    
          // 点外部关闭：文档上监听，触发区（含弹层，因为弹层就在同一个 ref 容器里）内不关。
          useEffect(() => {
            if (!open || typeof onDismiss !== 'function') return undefined
            const onPointerDown = (event) => {
              const node = anchorRef.current
              if (node !== null && typeof node.contains === 'function' && node.contains(event.target)) return
              onDismiss()
            }
            document.addEventListener('pointerdown', onPointerDown)
            return () => document.removeEventListener('pointerdown', onPointerDown)
          }, [open, onDismiss])
    
          const up = placement !== null && placement.up
          const popStyle = placement === null
            ? {
                position: 'fixed', zIndex: 20, boxSizing: 'border-box', visibility: 'hidden',
                ...(typeof width === 'number' ? { width } : null),
              }
            : {
                position: 'fixed', zIndex: 20, boxSizing: 'border-box',
                left: placement.left, top: placement.top, width: placement.width,
                maxHeight: placement.maxHeight, overflowY: 'auto',
              }
    
          return { anchorRef, popStyle, up }
        }
    
        /**
         * 分类组合框：可自由输入新分类，聚焦即展开已有分类（名称 + 条数）。
         * 过滤词用独立状态：打开下拉时清空，避免编辑已有分类时被输入框的当前值收窄成一项；
         * 只有下拉打开后继续输入才用新输入过滤，选中或清空后再次复位。
         * 弹层与输入框在同一个 ref 容器里，点击外部的判断因此能覆盖弹层自身。
         */
        function CategoryCombo({ t, value, categories, onChange, onManage }) {
          const [open, setOpen] = useState(false)
          const [query, setQuery] = useState('')
          const close = useCallback(() => setOpen(false), [])
          const popover = useAnchoredPopover(open, CATEGORY_POP.width, CATEGORY_POP.height, close)
    
          const openAll = () => {
            setQuery('')
            setOpen(true)
          }
    
          const text = asText(value)
          const needle = query.trim().toLowerCase()
          const visible = needle === ''
            ? categories
            : categories.filter((row) => row.name.toLowerCase().includes(needle))
          const countLabel = t('categoryCount')
    
          return h('div', {
            ref: popover.anchorRef,
            style: { position: 'relative' },
            // 焦点在输入框或下拉按钮里时，Esc 先收起下拉，再让弹窗的 document 监听看不到这次按键。
            onKeyDown: (event) => {
              if (!open || event.key !== 'Escape') return
              event.stopPropagation?.()
              close()
            },
          },
          h('input', {
            className: 'td-input',
            maxLength: 24,
            style: text === '' ? S.input : { ...S.input, paddingRight: 32 },
            value: text,
            placeholder: t('noCategory'),
            role: 'combobox',
            'aria-expanded': open ? 'true' : 'false',
            'aria-autocomplete': 'list',
            'aria-label': t('fieldCategory'),
            onFocus: openAll,
            onClick: () => { if (!open) openAll() },
            onChange: (event) => {
              onChange(event.target.value)
              setQuery(event.target.value)
              setOpen(true)
            },
          }),
          text !== ''
            ? h('button', {
                type: 'button',
                className: 'td-btn',
                style: S.comboClear,
                'aria-label': t('noCategory'),
                title: t('noCategory'),
                onClick: () => { onChange(''); openAll() },
              }, '×')
            : null,
          open
            ? h('div', { className: popover.up ? 'td-pop td-pop-up' : 'td-pop', style: popover.popStyle },
                visible.length === 0
                  ? h('div', { style: S.popEmpty }, t('categoryEmpty'))
                  : h('div', { style: S.popList }, visible.map((row) => h('button', {
                      key: row.name,
                      type: 'button',
                      className: 'td-btn',
                      style: S.popItem,
                      onClick: () => { onChange(row.name); setQuery(''); close() },
                    },
                    h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, row.name),
                    h('span', { style: S.popCount }, typeof countLabel === 'function' ? countLabel(row.count) : `${row.count} ${countLabel}`)))),
                h('div', { style: S.popSep, 'aria-hidden': 'true' }),
                h('button', {
                  type: 'button',
                  className: 'td-btn',
                  style: S.popManage,
                  onClick: () => { close(); onManage?.() },
                }, t('categoryManage')))
            : null)
        }
    
        /**
         * 日期 / 时间选择器共用的开合状态；定位与点外部关闭都在 useAnchoredPopover。
         * Esc 交给各字段外框的 onKeyDown，避免连带关掉弹窗。
         */
        function usePickerPopover() {
          const [open, setOpen] = useState(false)
          const openPopover = useCallback(() => setOpen(true), [])
          const closePopover = useCallback(() => setOpen(false), [])
          return { open, openPopover, closePopover }
        }
    
        /** 自绘日期选择器：触发区 + 快捷行 + 6×7 月历；点日期、快捷按钮或清除都会关闭。 */
        function DateField({ t, value, onChange }) {
          const picker = usePickerPopover()
          const popover = useAnchoredPopover(picker.open, DATE_POP.width, DATE_POP.height, picker.closePopover)
          const [cursor, setCursor] = useState(() => {
            const at = parseDateKey(value) ?? new Date()
            return { year: at.getFullYear(), month: at.getMonth() }
          })
    
          const text = asText(value)
          const todayKey = dateKeyOf(new Date())
          const monthKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`
          const cells = monthGrid(cursor.year, cursor.month)
          const weekdays = weekdayLabels(t)
    
          const closeWith = (next) => {
            onChange(next)
            picker.closePopover()
          }
    
          const open = () => {
            if (picker.open) { picker.closePopover(); return }
            const at = parseDateKey(text) ?? new Date()
            setCursor({ year: at.getFullYear(), month: at.getMonth() })
            picker.openPopover()
          }
    
          const moveMonth = (delta) => {
            const at = new Date(cursor.year, cursor.month + delta, 1)
            setCursor({ year: at.getFullYear(), month: at.getMonth() })
          }
    
          const monthAt = (delta) => {
            const at = new Date(cursor.year, cursor.month + delta, 1)
            return monthTitle(at.getFullYear(), at.getMonth())
          }
    
          const pickDay = (delta) => {
            const at = new Date()
            closeWith(dateKeyOf(new Date(at.getFullYear(), at.getMonth(), at.getDate() + delta)))
          }
    
          const pickNextMonday = () => {
            const at = new Date()
            const delta = ((1 - at.getDay() + 7) % 7) || 7
            closeWith(dateKeyOf(new Date(at.getFullYear(), at.getMonth(), at.getDate() + delta)))
          }
    
          return h('div', {
            ref: popover.anchorRef,
            style: { position: 'relative' },
            onKeyDown: (event) => {
              if (!picker.open || event.key !== 'Escape') return
              event.stopPropagation?.()
              picker.closePopover()
            },
          },
          h('button', {
            type: 'button',
            className: 'td-btn td-input',
            style: text === '' ? { ...S.pickerTrigger, ...S.pickerPlaceholder } : S.pickerTrigger,
            'aria-haspopup': 'dialog',
            'aria-expanded': picker.open ? 'true' : 'false',
            'aria-label': t('pickDate'),
            onClick: open,
          },
          h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, text === '' ? t('pickDate') : text),
          h('span', { style: S.pickerIcon, 'aria-hidden': 'true' }, '▾')),
    
          picker.open
            ? h('div', {
                className: popover.up ? 'td-pop td-picker td-picker-date td-pop-up' : 'td-pop td-picker td-picker-date',
                style: popover.popStyle,
                role: 'dialog',
                'aria-label': t('pickDate'),
              },
              h('div', { style: S.pickerHead },
                h('button', {
                  type: 'button', className: 'td-btn', style: S.pickerIconBtn,
                  'aria-label': monthAt(-1), onClick: () => moveMonth(-1),
                }, '‹'),
                h('span', { style: S.pickerTitle }, monthTitle(cursor.year, cursor.month)),
                h('button', {
                  type: 'button', className: 'td-btn', style: S.pickerIconBtn,
                  'aria-label': monthAt(1), onClick: () => moveMonth(1),
                }, '›')),
              h('div', { style: S.pickerQuick },
                h('button', {
                  type: 'button', className: 'td-btn', style: S.pickerQuickBtn,
                  onClick: () => pickDay(0),
                }, t('today')),
                h('button', {
                  type: 'button', className: 'td-btn', style: S.pickerQuickBtn,
                  onClick: () => pickDay(1),
                }, t('tomorrowQuick')),
                h('button', {
                  type: 'button', className: 'td-btn', style: S.pickerQuickBtn,
                  onClick: pickNextMonday,
                }, t('nextMonday'))),
              h('div', { style: S.pickerWeekdays, 'aria-hidden': 'true' },
                weekdays.map((label, index) => h('div', { key: `${index}`, style: S.pickerWeekday }, label))),
              h('div', { style: S.pickerGrid },
                cells.map((key) => {
                  const inMonth = key.slice(0, 7) === monthKey
                  const selected = key === text
                  return h('button', {
                    key,
                    type: 'button',
                    className: 'td-btn',
                    style: {
                      ...S.pickerDay,
                      ...(key === todayKey ? S.pickerDayToday : null),
                      ...(selected ? S.pickerDayOn : null),
                      ...(inMonth ? null : S.pickerDayOff),
                    },
                    'aria-label': key,
                    'aria-pressed': selected ? 'true' : 'false',
                    onClick: () => closeWith(key),
                  }, String(Number(key.slice(8, 10))))
                })),
              h('button', {
                type: 'button', className: 'td-btn', style: S.pickerClear,
                onClick: () => closeWith(''),
              }, t('clearValue')))
            : null)
        }
    
        /** 自绘时间选择器：左右两列可滚动列表，点小时即时高亮但不提交，点分钟才设值并关闭。 */
        function TimeField({ t, value, onChange }) {
          const picker = usePickerPopover()
          const popover = useAnchoredPopover(picker.open, TIME_POP.width, TIME_POP.height, picker.closePopover)
          const [draftHour, setDraftHour] = useState(null)
          const hourItemRef = useRef(null)
          const minuteItemRef = useRef(null)
          const alive = useRef(true)
    
          const text = asText(value)
          const parsed = splitTimeKey(text)
    
          useEffect(() => {
            alive.current = true
            return () => { alive.current = false }
          }, [])
    
          // 打开后把已选项滚到列表中间；effect 同步执行，卸载后 alive 为 false 不再碰 DOM。
          useEffect(() => {
            if (!picker.open || !alive.current) return
            const hourNode = hourItemRef.current
            if (hourNode !== null && typeof hourNode.scrollIntoView === 'function') hourNode.scrollIntoView({ block: 'center' })
            const minuteNode = minuteItemRef.current
            if (minuteNode !== null && typeof minuteNode.scrollIntoView === 'function') minuteNode.scrollIntoView({ block: 'center' })
          }, [picker.open])
    
          const open = () => {
            if (picker.open) { picker.closePopover(); return }
            const parts = splitTimeKey(text)
            setDraftHour(parts === null ? null : parts.hour)
            picker.openPopover()
          }
    
          const closeWith = (next) => {
            onChange(next)
            picker.closePopover()
          }
    
          const pickMinute = (minute) => {
            const hour = draftHour ?? String(new Date().getHours()).padStart(2, '0')
            closeWith(`${hour}:${minute}`)
          }
    
          return h('div', {
            ref: popover.anchorRef,
            style: { position: 'relative' },
            onKeyDown: (event) => {
              if (!picker.open || event.key !== 'Escape') return
              event.stopPropagation?.()
              picker.closePopover()
            },
          },
          h('button', {
            type: 'button',
            className: 'td-btn td-input',
            style: text === '' ? { ...S.pickerTrigger, ...S.pickerPlaceholder } : S.pickerTrigger,
            'aria-haspopup': 'dialog',
            'aria-expanded': picker.open ? 'true' : 'false',
            'aria-label': t('pickTime'),
            onClick: open,
          },
          h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, text === '' ? t('pickTime') : text),
          h('span', { style: S.pickerIcon, 'aria-hidden': 'true' }, '▾')),
    
          picker.open
            ? h('div', {
                className: popover.up ? 'td-pop td-picker td-picker-time td-pop-up' : 'td-pop td-picker td-picker-time',
                style: popover.popStyle,
                role: 'dialog',
                'aria-label': t('pickTime'),
              },
              h('div', { style: S.timeCols },
                h('div', { style: S.timeCol },
                  h('div', { style: S.timeHead, 'aria-hidden': 'true' }, t('hourShort')),
                  h('div', { style: S.timeList }, HOUR_OPTIONS.map((hour) => h('button', {
                    key: `h-${hour}`,
                    type: 'button',
                    className: 'td-btn',
                    ref: hour === draftHour ? hourItemRef : null,
                    style: hour === draftHour ? { ...S.timeItem, ...S.timeItemOn } : S.timeItem,
                    'aria-pressed': hour === draftHour ? 'true' : 'false',
                    onClick: () => setDraftHour(hour),
                  }, hour)))),
                h('div', { style: S.timeCol },
                  h('div', { style: S.timeHead, 'aria-hidden': 'true' }, t('minuteShort')),
                  h('div', { style: S.timeList }, MINUTE_OPTIONS.map((minute) => h('button', {
                    key: `m-${minute}`,
                    type: 'button',
                    className: 'td-btn',
                    ref: parsed !== null && minute === parsed.minute ? minuteItemRef : null,
                    style: parsed !== null && minute === parsed.minute ? { ...S.timeItem, ...S.timeItemOn } : S.timeItem,
                    'aria-pressed': parsed !== null && minute === parsed.minute ? 'true' : 'false',
                    onClick: () => pickMinute(minute),
                  }, minute))))),
              h('button', {
                type: 'button', className: 'td-btn', style: S.pickerClear,
                onClick: () => closeWith(''),
              }, t('clearValue')))
            : null)
        }
    
        function Row({ item, selected, onSelect, onToggle, t }) {
          const today = new Date()
          const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          const title = asText(item.title)
          const dueDate = asText(item.dueDate)
          const category = asText(item.category)
          // 循环任务以本周期实例为准：dueDate 为空说明系列已结束，复选框置灰且不响应。
          const seriesEnded = Boolean(item.isRepeating) && !dueDate
          // 逾期桶与「截止日早于今天」是同一判定；循环行的 dueDate 就是本次，同样参与比较。
          const late = !item.done && (item.bucket === 'overdue' || (dueDate !== '' && dueDate < todayKey))
          // 行本身保持普通 div：按钮的子元素在 ARIA 里是 presentational，行若 role="button"，
          // 里面的 role="checkbox" 读屏就看不到了。鼠标仍点整行选中；键盘走标题与复选框两个独立控件。
          // 未选中时不写内联 background，悬停底色交给 .td-row:hover。
          return h('div', {
            className: 'td-row',
            style: selected ? { ...S.row, background: 'var(--dsw-alias-interactive-bg-hover)' } : S.row,
            onClick: () => onSelect(item.id),
          },
          h('span', {
            'aria-hidden': 'true',
            style: {
              width: 3, height: 18, borderRadius: 2, flex: 'none',
              background: item.priority ? priorityColor(item.priority) : 'transparent',
            },
          }),
          checkHit(
            () => { if (!seriesEnded) onToggle(item) },
            h('span', {
              role: 'checkbox',
              'aria-checked': item.done ? 'true' : 'false',
              'aria-disabled': seriesEnded ? 'true' : undefined,
              'aria-label': title,
              tabIndex: 0,
              className: 'td-check',
              style: seriesEnded ? { ...(item.done ? S.cbDone : S.cb), opacity: 0.45 } : (item.done ? S.cbDone : S.cb),
              onKeyDown: (e) => {
                if (e.nativeEvent?.isComposing === true) return
                if (seriesEnded) return
                if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onToggle(item) }
              },
            }, item.done
              ? h('svg', { width: 9, height: 9, viewBox: '0 0 16 16', fill: 'none', stroke: 'var(--dsw-alias-label-primary-inverted)', strokeWidth: 2.4 },
                  h('path', { d: 'M3.4 8.4 6.2 11l6.4-6.4', strokeLinecap: 'round', strokeLinejoin: 'round' }))
              : null),
          ),
          h('button', {
            type: 'button',
            className: 'td-title',
            'aria-current': selected ? 'true' : 'false',
            style: item.done ? S.nmDone : S.nm,
            onClick: (e) => { e.stopPropagation(); onSelect(item.id) },
          }, title),
          item.isRepeating ? h('span', { style: S.repeatBadge }, t('repeatBadge')) : null,
          category !== '' ? h('span', { style: S.tag }, category) : null,
          item.done && item.doneBy === 'agent' && !item.verifiedAt
            ? h('span', { style: { ...S.tag, color: 'var(--dsw-alias-state-warn-primary)' } }, t('needsReview'))
            : null,
          h('span', { style: late ? S.dueLate : S.due }, item.bucket === 'stale' ? staleLabel(item, t, today) : dueLabel(item)),
          )
        }
    
        /**
         * 新建 / 编辑弹窗：顶部一句话填写（200ms 防抖复用 parse），下面是全部字段。
         * 空字符串一律转成 null 再提交，否则宿主会把 '' 当成「有值」。
         * 保存失败时只在弹窗内报错，不关闭、不清空用户已经填的内容。
         */
        function TodoDialog({ t, initial, mutate, onClose, onSaved, onManageCategories, escSuspended }) {
          // `initial` 有两种语义：带 id 是编辑；只带 dueDate 是从某一天「新建」时的预填。
          const editing = initial !== null && initial !== undefined && initial.id !== null && initial.id !== undefined
          const [form, setForm] = useState(() => ({
            id: editing ? initial.id : null,
            title: editing ? asText(initial.title) : (asText(initial?.title) ?? ''),
            note: editing ? asText(initial.note) : '',
            dueDate: editing ? asText(initial.dueDate) : (asText(initial?.dueDate) || dateKeyOf(new Date())),
            dueTime: editing ? asText(initial.dueTime) : '',
            priority: editing && ['high', 'medium', 'low'].includes(initial.priority) ? initial.priority : null,
            category: editing ? asText(initial.category) : '',
            repeatFreq: initial?.repeat?.freq ?? '',
            weekdays: initial?.repeat?.weekdays ?? [],
            monthDay: initial?.repeat?.monthDay ?? new Date().getDate(),
            until: initial?.repeat?.until ?? '',
          }))
          const [quick, setQuick] = useState('')
          const [error, setError] = useState(null)
          const [saving, setSaving] = useState(false)
          // 分类候选只在弹窗打开时拉一次；保存后页面自己会刷新，下一次开窗再拉。
          const [categoryRows, setCategoryRows] = useState([])
    
          const alive = useRef(true)
          const seq = useRef(0)
          const closeRef = useRef(onClose)
    
          useEffect(() => {
            alive.current = true
            return () => { alive.current = false }
          }, [])
    
          useEffect(() => { closeRef.current = onClose }, [onClose])
    
          // 分类条数与名称由服务端统计；失败不阻塞表单，下拉退化成「暂无分类」。
          useEffect(() => {
            let cancelled = false
            fetchApi('categories', {}, t)
              .then((result) => {
                if (cancelled || !alive.current) return
                setCategoryRows(normalizeCategories(result))
              })
              .catch((err) => console.error('[dsh-inbox-planner todo] categories failed', err))
            return () => { cancelled = true }
          }, [])
    
          // 弹窗打开期间才监听 Esc；分类管理弹窗叠在上面时由它自己接管，避免 Esc 一次关两层。
          useEffect(() => {
            if (escSuspended) return undefined
            const onKeyDown = (event) => {
              if (event.key !== 'Escape') return
              event.stopPropagation?.()
              closeRef.current()
            }
            document.addEventListener('keydown', onKeyDown)
            return () => document.removeEventListener('keydown', onKeyDown)
          }, [escSuspended])
    
          // 输入停顿 200ms 后解析；seq 保证只有最后一次输入的结果能写表单。
          useEffect(() => {
            const current = ++seq.current
            if (quick.trim() === '') return undefined
            const timer = window.setTimeout(() => {
              fetchApi('parse', { text: quick })
                .then((parsed) => {
                  if (!alive.current || current !== seq.current) return
                  setForm((prev) => ({
                    ...prev,
                    title: parsed.title || prev.title,
                    dueDate: parsed.dueDate || prev.dueDate,
                    dueTime: parsed.dueTime || prev.dueTime,
                    priority: parsed.priority ?? prev.priority,
                    category: parsed.category || prev.category,
                  }))
                })
                .catch(() => {})
            }, 200)
            return () => window.clearTimeout(timer)
          }, [quick])
    
          const submit = async () => {
            if (saving) return
            const title = form.title.trim()
            if (title === '') {
              setError(t('titleRequired'))
              return
            }
            if (form.repeatFreq === 'weekly' && form.weekdays.length === 0) {
              setError(t('weekdaysRequired'))
              return
            }
            const category = form.category.trim()
            const payload = {
              title,
              note: form.note,
              dueDate: form.dueDate || null,
              dueTime: form.dueTime || null,
              priority: form.priority || null,
              category: category === '' ? null : category,
              repeat: form.repeatFreq === ''
                ? null
                : form.repeatFreq === 'weekly'
                  ? { freq: 'weekly', weekdays: form.weekdays }
                  : form.repeatFreq === 'monthly'
                    ? { freq: 'monthly', monthDay: form.monthDay }
                    : { freq: 'daily' },
            }
            if (form.until !== '' && payload.repeat !== null) payload.repeat.until = form.until
            setError(null)
            setSaving(true)
            try {
              const res = form.id === null
                ? await mutate('create', payload)
                : await mutate('update', { id: form.id, patch: payload })
              if (!res.ok) {
                setError(res.error?.message ?? t('requestFailed'))
                return
              }
              onSaved()
            } catch (err) {
              setError(err instanceof Error && err.message ? err.message : t('requestFailed'))
            } finally {
              if (alive.current) setSaving(false)
            }
          }
    
          const modeLabel = t(editing ? 'dialogEdit' : 'dialogNew')
    
          return h('div', {
            className: 'td-overlay',
            style: S.overlay,
            onClick: (event) => { if (event.target === event.currentTarget) onClose() },
          },
          h('div', { className: 'td-dialog', style: S.dialog, role: 'dialog', 'aria-modal': 'true', 'aria-label': modeLabel },
            h('div', { style: S.dialogHead }, modeLabel),
            h('div', { style: { marginBottom: 12 } },
              h('input', {
                className: 'td-input',
                style: { ...S.search, width: '100%', boxSizing: 'border-box' },
                value: quick, placeholder: t('quickFill'), 'aria-label': t('quickFill'),
                onChange: (e) => setQuick(e.target.value),
              }),
              h('div', { style: S.hint }, t('quickHint'))),
    
            h('label', { style: S.field },
              h('span', { style: S.fieldLabel }, t('fieldTitle')),
              h('input', {
                className: 'td-input',
                maxLength: 200,
                autoFocus: true, style: S.input, value: form.title,
                onChange: (e) => setForm((prev) => ({ ...prev, title: e.target.value })),
                onKeyDown: (e) => {
                  if (e.nativeEvent?.isComposing === true) return
                  if (e.key === 'Enter') void submit()
                },
              })),
    
            h('label', { style: S.field },
              h('span', { style: S.fieldLabel }, t('fieldNote')),
              h('textarea', {
                className: 'td-input',
                maxLength: 2000,
                rows: 3, style: S.textarea, value: form.note,
                onChange: (e) => setForm((prev) => ({ ...prev, note: e.target.value })),
              })),
    
            h('div', { style: S.fieldRow },
              h('div', { style: S.field },
                h('span', { style: S.fieldLabel }, t('fieldDate')),
                h(DateField, {
                  t,
                  value: form.dueDate,
                  onChange: (next) => setForm((prev) => ({ ...prev, dueDate: next })),
                })),
              h('div', { style: S.field },
                h('span', { style: S.fieldLabel }, t('fieldTime')),
                h(TimeField, {
                  t,
                  value: form.dueTime,
                  onChange: (next) => setForm((prev) => ({ ...prev, dueTime: next })),
                }))),
    
            h('div', { style: S.field },
              h('span', { style: S.fieldLabel }, t('fieldPriority')),
              h('div', { style: S.seg },
                [['high', 'priorityHigh'], ['medium', 'priorityMedium'], ['low', 'priorityLow']].map(([value, key]) =>
                  h('button', {
                    key: value, type: 'button',
                    className: 'td-btn',
                    'aria-pressed': form.priority === value ? 'true' : 'false',
                    style: { ...S.segItem, ...(form.priority === value ? S.segItemOn : null) },
                    onClick: () => setForm((prev) => ({
                      ...prev,
                      priority: prev.priority === value ? null : value,
                    })),
                  }, t(key))))),
    
            h('div', { style: S.field },
              h('span', { style: S.fieldLabel }, t('fieldCategory')),
              h(CategoryCombo, {
                t,
                value: form.category,
                categories: categoryRows,
                onChange: (next) => setForm((prev) => ({ ...prev, category: next })),
                onManage: onManageCategories,
              })),
    
            h('label', { style: S.field },
              h('span', { style: S.fieldLabel }, t('fieldRepeat')),
              h('select', {
                className: 'td-input',
                style: S.input,
                value: form.repeatFreq,
                onChange: (e) => setForm((prev) => ({ ...prev, repeatFreq: e.target.value })),
              },
              [['', 'repeatNone'], ['daily', 'repeatDaily'], ['weekly', 'repeatWeekly'], ['monthly', 'repeatMonthly']].map(([value, key]) =>
                h('option', { key: value === '' ? 'none' : value, value }, t(key))))),
    
            form.repeatFreq === 'weekly'
              ? h('div', { style: S.field },
                  h('span', { style: S.fieldLabel }, t('fieldWeekdays')),
                  h('div', { style: S.seg }, WEEKDAY_OPTIONS.map(([key, iso]) =>
                    h('button', {
                      key: iso, type: 'button', className: 'td-btn',
                      'aria-pressed': form.weekdays.includes(iso) ? 'true' : 'false',
                      style: { ...S.segItem, ...(form.weekdays.includes(iso) ? S.segItemOn : null) },
                      onClick: () => setForm((prev) => ({
                        ...prev,
                        weekdays: prev.weekdays.includes(iso)
                          ? prev.weekdays.filter((day) => day !== iso)
                          : [...prev.weekdays, iso],
                      })),
                    }, t(key)))))
              : null,
    
            form.repeatFreq === 'monthly'
              ? h('label', { style: S.field },
                  h('span', { style: S.fieldLabel }, t('fieldMonthDay')),
                  h('select', {
                    className: 'td-input',
                    style: S.input,
                    value: String(form.monthDay),
                    onChange: (e) => setForm((prev) => ({ ...prev, monthDay: Number(e.target.value) })),
                  }, MONTH_DAYS.map((day) => h('option', { key: day, value: String(day) }, String(day)))))
              : null,
    
            form.repeatFreq !== ''
              ? h('div', { style: S.field },
                  h('span', { style: S.fieldLabel }, t('fieldUntil')),
                  h(DateField, {
                    t,
                    value: form.until,
                    onChange: (next) => setForm((prev) => ({ ...prev, until: next })),
                  }))
              : null,
    
            error !== null ? h('div', { style: S.dialogError }, error) : null,
            h('div', { style: S.dialogFoot },
              h('button', { type: 'button', className: 'td-btn', style: S.btnGhost, onClick: onClose, disabled: saving }, t('cancel')),
              h('button', { type: 'button', className: 'td-primary', style: S.btnPrimary, onClick: () => void submit(), disabled: saving }, t('save'))),
          ))
        }
    
        /**
         * 分类管理弹窗：行内改名、两段式删除；写成功后先刷新页面列表，再重拉分类计数。
         * 入口有两处：页头「分类」按钮，以及新建 / 编辑弹窗分类下拉底部的「管理分类」。
         */
        function CategoryDialog({ t, onClose, onChanged }) {
          const [rows, setRows] = useState(null)
          const [loadFailed, setLoadFailed] = useState(false)
          const [editing, setEditing] = useState(null)
          const [confirming, setConfirming] = useState(null)
          const [saving, setSaving] = useState(false)
          const [error, setError] = useState(null)
    
          const alive = useRef(true)
          const closeRef = useRef(onClose)
          const tRef = useRef(t)
          const confirmTimer = useRef(null)
    
          useEffect(() => { tRef.current = t }, [t])
    
          const clearConfirmTimer = useCallback(() => {
            if (confirmTimer.current !== null) {
              window.clearTimeout(confirmTimer.current)
              confirmTimer.current = null
            }
          }, [])
    
          useEffect(() => {
            alive.current = true
            return () => {
              alive.current = false
              clearConfirmTimer()
            }
          }, [clearConfirmTimer])
    
          useEffect(() => { closeRef.current = onClose }, [onClose])
    
          const load = useCallback(async () => {
            try {
              const result = await fetchApi('categories', {}, tRef.current)
              if (!alive.current) return
              setRows(normalizeCategories(result))
              setLoadFailed(false)
            } catch (err) {
              if (!alive.current) return
              console.error('[dsh-inbox-planner todo] categories failed', err)
              setRows([])
              setLoadFailed(true)
            }
          }, [])
    
          useEffect(() => { void load() }, [load])
    
          // 弹窗打开期间才监听 Esc；卸载时解绑，避免宿主里留下悬空监听。
          useEffect(() => {
            const onKeyDown = (event) => {
              if (event.key !== 'Escape') return
              event.stopPropagation?.()
              closeRef.current()
            }
            document.addEventListener('keydown', onKeyDown)
            return () => document.removeEventListener('keydown', onKeyDown)
          }, [])
    
          /** 先刷新页面（行上的分类标签），再重拉弹窗自己的名称与计数。 */
          const refreshAfterWrite = useCallback(async () => {
            await onChanged?.()
            await load()
          }, [load, onChanged])
    
          const startRename = (name) => {
            clearConfirmTimer()
            setConfirming(null)
            setError(null)
            setEditing({ from: name, value: name })
          }
    
          const submitRename = async () => {
            if (editing === null || saving) return
            const to = editing.value.trim()
            if (to === '') return
            if (to === editing.from) { setEditing(null); return }
            setSaving(true)
            setError(null)
            try {
              await fetchApi('renameCategory', { from: editing.from, to }, tRef.current)
              if (!alive.current) return
              setEditing(null)
              await refreshAfterWrite()
            } catch (err) {
              if (!alive.current) return
              setError(err instanceof Error && err.message ? err.message : tRef.current('requestFailed'))
            } finally {
              if (alive.current) setSaving(false)
            }
          }
    
          const requestDelete = async (name) => {
            if (saving) return
            setError(null)
            if (confirming !== name) {
              clearConfirmTimer()
              setEditing(null)
              setConfirming(name)
              confirmTimer.current = window.setTimeout(() => {
                confirmTimer.current = null
                setConfirming(null)
              }, 3000)
              return
            }
            clearConfirmTimer()
            setConfirming(null)
            setSaving(true)
            try {
              await fetchApi('clearCategory', { name }, tRef.current)
              if (!alive.current) return
              setEditing(null)
              await refreshAfterWrite()
            } catch (err) {
              if (!alive.current) return
              setError(err instanceof Error && err.message ? err.message : tRef.current('requestFailed'))
            } finally {
              if (alive.current) setSaving(false)
            }
          }
    
          const countLabel = t('categoryCount')
    
          return h('div', {
            className: 'td-overlay',
            style: S.overlay,
            onClick: (event) => { if (event.target === event.currentTarget) onClose() },
          },
          h('div', { className: 'td-dialog', style: S.dialog, role: 'dialog', 'aria-modal': 'true', 'aria-label': t('category') },
            h('div', { style: S.dialogHead }, t('category')),
            h('div', { style: S.catHint }, t('categoryHint')),
            loadFailed ? h('div', { style: S.dialogError }, t('failed')) : null,
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 320, overflowY: 'auto', marginTop: 4 } },
              rows === null
                ? h('div', { style: S.catEmpty }, t('loading'))
                : rows.length === 0
                  ? h('div', { style: S.catEmpty }, t('categoryEmpty'))
                  : rows.map((row) => {
                      const renaming = editing !== null && editing.from === row.name
                      const confirmingThis = confirming === row.name
                      return h('div', { key: row.name, className: 'td-row', style: S.catRow },
                        renaming
                          ? h('input', {
                              className: 'td-input',
                              autoFocus: true,
                              style: { ...S.input, height: 28, flex: 1, minWidth: 0 },
                              value: editing.value,
                              'aria-label': t('rename'),
                              onChange: (event) => setEditing((prev) => (prev === null ? prev : { ...prev, value: event.target.value })),
                              onKeyDown: (event) => {
                                if (event.nativeEvent?.isComposing === true) return
                                if (event.key === 'Enter') { event.preventDefault?.(); void submitRename() }
                                if (event.key === 'Escape') { event.preventDefault?.(); event.stopPropagation?.(); setEditing(null) }
                              },
                            })
                          : h('span', { style: S.catName }, row.name),
                        h('span', { style: S.catCount }, typeof countLabel === 'function' ? countLabel(row.count) : `${row.count} ${countLabel}`),
                        renaming
                          ? [
                              h('button', {
                                key: 'save',
                                type: 'button',
                                className: 'td-btn td-primary',
                                style: S.catSave,
                                disabled: saving || editing.value.trim() === '',
                                onClick: () => void submitRename(),
                              }, t('saveRename')),
                              h('button', {
                                key: 'cancel',
                                type: 'button',
                                className: 'td-btn',
                                style: S.catAction,
                                disabled: saving,
                                onClick: () => setEditing(null),
                              }, t('cancelRename')),
                            ]
                          : [
                              h('button', {
                                key: 'rename',
                                type: 'button',
                                className: 'td-btn',
                                style: S.catAction,
                                disabled: saving,
                                onClick: () => startRename(row.name),
                              }, t('rename')),
                              h('button', {
                                key: 'delete',
                                type: 'button',
                                className: 'td-btn',
                                style: confirmingThis
                                  ? { ...S.catAction, color: 'var(--dsw-alias-state-error-primary)', borderColor: 'var(--dsw-alias-state-error-primary)' }
                                  : S.catAction,
                                disabled: saving,
                                onClick: () => void requestDelete(row.name),
                              }, confirmingThis ? t('confirmDelete') : t('deleteOne')),
                            ],
                      )
                    }),
            ),
            error !== null ? h('div', { style: S.dialogError }, error) : null,
            h('div', { style: S.dialogFoot },
              h('button', { type: 'button', className: 'td-btn', style: S.btnGhost, onClick: onClose }, t('dismiss'))),
          ))
        }
    
        /**
         * 月视图日历：6×7 月网格直接复用 DateField 的 monthGrid / weekdayLabels，
         * 数据按整格区间（首格到末格）拉 occurrences，切月或任何写操作（version）后重新拉。
         */
        function CalendarView({ t, selectedDay, onPickDay, version }) {
          const [cursor, setCursor] = useState(() => {
            const at = new Date()
            return { year: at.getFullYear(), month: at.getMonth() }
          })
          const [byDate, setByDate] = useState({})
    
          const cells = monthGrid(cursor.year, cursor.month)
          const from = cells[0]
          const to = cells[cells.length - 1]
          const monthKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`
          const todayKey = dateKeyOf(new Date())
          const weekdays = weekdayLabels(t)
    
          useEffect(() => {
            let alive = true
            fetchApi('occurrences', { from, to })
              .then((result) => {
                if (!alive) return
                const map = {}
                for (const item of Array.isArray(result.items) ? result.items : []) {
                  ;(map[item.date] ??= []).push(item)
                }
                setByDate(map)
              })
              .catch((err) => {
                if (!alive) return
                console.error('[dsh-inbox-planner todo] occurrences failed', err)
                setByDate({})
              })
            return () => { alive = false }
          }, [from, to, version])
    
          const move = (delta) => {
            const at = new Date(cursor.year, cursor.month + delta, 1)
            setCursor({ year: at.getFullYear(), month: at.getMonth() })
          }
    
          const goToday = () => {
            const at = new Date()
            setCursor({ year: at.getFullYear(), month: at.getMonth() })
          }
    
          return h('div', { style: S.calendar },
            h('div', { style: S.calendarHead },
              h('button', {
                type: 'button', className: 'td-btn', style: S.iconBtn,
                'aria-label': t('prevMonth'), onClick: () => move(-1),
              }, '‹'),
              h('div', { style: S.calendarTitle }, monthTitle(cursor.year, cursor.month)),
              h('button', {
                type: 'button', className: 'td-btn', style: S.iconBtn,
                'aria-label': t('nextMonth'), onClick: () => move(1),
              }, '›'),
              h('button', {
                type: 'button', className: 'td-btn',
                style: { ...S.btnGhost, height: 28, padding: '0 10px' },
                onClick: goToday,
              }, t('today'))),
            h('div', { style: S.calendarWeekdays, 'aria-hidden': 'true' },
              weekdays.map((label, index) => h('div', { key: String(index), style: S.calendarWeekday }, label))),
            h('div', { style: S.calendarGrid },
              cells.map((key) => {
                const items = byDate[key] ?? []
                const inMonth = key.slice(0, 7) === monthKey
                const selected = key === selectedDay
                return h('div', {
                  key,
                  role: 'button',
                  tabIndex: 0,
                  className: 'td-btn td-cal-cell',
                  'aria-label': key,
                  'data-date': key,
                  style: {
                    ...S.calendarCell,
                    ...(selected ? S.calendarCellSelected : null),
                    ...(inMonth ? null : S.pickerDayOff),
                  },
                  onClick: () => onPickDay(key),
                  onKeyDown: (event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault?.()
                    onPickDay(key)
                  },
                },
                h('div', { style: key === todayKey ? { ...S.calendarDay, ...S.calendarDayToday } : S.calendarDay }, String(Number(key.slice(8, 10)))),
                items.slice(0, 2).map((item) => h('div', {
                  key: `${item.todoId}-${item.date}`,
                  style: S.calendarItem,
                },
                h('span', { style: { ...S.dot, background: priorityColor(item.priority) }, 'aria-hidden': 'true' }),
                h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, asText(item.title)))),
                items.length > 2 ? h('div', { style: S.calendarMore }, `+${items.length - 2}`) : null)
              })),
          )
        }
    
        let corruptDismissed = false
    
        function TodoPage(props) {
          const t = props.t ?? ((key) => dict.zh[key] ?? key)
          const [state, setState] = useState({ loading: true, error: null, items: [], summary: {}, notices: [], staleDays: 7 })
          const [query, setQuery] = useState('')
          const [selected, setSelected] = useState(null)
          const [dialog, setDialog] = useState(null)
          const [categoryOpen, setCategoryOpen] = useState(false)
          const [confirming, setConfirming] = useState(false)
          // 默认展开「已完成」；用户仍可手动收起，收起后靠 doneTouched 保持。
          const [doneOpen, setDoneOpen] = useState(true)
          // 「已完成」的范围：today | week | month；默认看整周，而不是只看今天。
          const [doneRange, setDoneRange] = useState('week')
          const [noticeHidden, setNoticeHidden] = useState(corruptDismissed)
          const [retrying, setRetrying] = useState(false)
          const [view, setView] = useState('list')
          // 便签坞：notes 数据、正在行内编辑的便签 id、快速输入框内容与焦点。
          const [notes, setNotes] = useState([])
          const [editingNote, setEditingNote] = useState(null)
          const [quickNote, setQuickNote] = useState('')
          const noteInputRef = useRef(null)
          // 行内编辑 Esc=丢弃草稿（设计 §4.2）：按 note.id 在 Set 里记「这次失焦不保存」，
          // 再照 T6 链路同步真实 blur；onBlur 见到标记就跳过保存。标记只在 blur 同步派发
          // onBlur 的一瞬存活，由 onBlur 的 delete 消费，Enter/失焦保存仍走原路。
          const discardNoteRef = useRef(new Set())
          // 页头筛选（v3 拆分缺口补录）：分类 / 无分类 / 优先级三路 + 面板开合；categoryRows 由 reload 侧车刷新。
          const [fCategory, setFCategory] = useState('')
          const [fUncategorized, setFUncategorized] = useState(false)
          const [fPriority, setFPriority] = useState('')
          const [categoryRows, setCategoryRows] = useState([])
          const [filterOpen, setFilterOpen] = useState(false)
          const headFilterRef = useRef(null)
          // 写操作（勾选/完成等）失败的可见提示，存服务端错误文案（null = 无错误）。
          // 它和读取失败的 state.error 分开：自己保留 5 秒，2.5 秒轮询成功也不会把它清掉。
          const [actionError, setActionError] = useState(null)
          // 循环任务已完成实例：窗口覆盖本月并向后多留 62 天，只喂「已完成」分组，
          // 不参与 summary，也不混进主列表。
          const [recurringDone, setRecurringDone] = useState([])
          // 写操作计数器：日历与当天清单都靠它重拉 occurrences，避免写后还看旧数据。
          const [dataVersion, setDataVersion] = useState(0)
          // 日历选中的那一天；清单数据由 [dayKey, dataVersion] 单独拉，不再存点击时的快照。
          const [dayKey, setDayKey] = useState(null)
          const [dayItems, setDayItems] = useState([])
          // 「已结束」循环分组折叠区：默认收起，点组头开合（与已完成区同型交互）。
          const [endedOpen, setEndedOpen] = useState(false)
    
          // 页头筛选弹层：定位与点外部关闭交给 useAnchoredPopover（调用形态对齐 DateField）。
          // 锚容器必须把触发钮与面板包在一起——点外判断用的 node.contains 只认同一个 ref 容器。
          const closeFilter = useCallback(() => setFilterOpen(false), [])
          const filterPop = useAnchoredPopover(filterOpen, FILTER_POP.width, FILTER_POP.height, closeFilter)
    
          // t 走 ref：语言切换时调用方可能换掉 props.t，但不该让 reload 重新排队。
          const tRef = useRef(t)
          useEffect(() => { tRef.current = t }, [t])
    
          // 请求序号：只有最后一次 list 的结果能落到 state，旧响应直接丢弃。
          const seqRef = useRef(0)
    
          // 「已完成」折叠控制：未核实项首次出现时自动展开一次；用户手动开/收过之后
          // 就不再抢控制权。prevPending 只认 0 → N 的跃迁，2.5s 轮询不会反复弹开。
          const doneTouched = useRef(false)
          const prevPending = useRef(0)
    
          // 删除二次确认的 3s 自动撤回：timer id 必须存下来，换选/卸载时才能取消，
          // 否则上一条的旧 timer 会在新条的确认窗口里把它提前撤回。
          const confirmTimer = useRef(null)
          const clearConfirmTimer = useCallback(() => {
            if (confirmTimer.current !== null) {
              window.clearTimeout(confirmTimer.current)
              confirmTimer.current = null
            }
          }, [])
    
          // 写失败提示的 5s 计时器：重新失败时从头计时，卸载时清掉。
          const actionErrorTimer = useRef(null)
          const clearActionErrorTimer = useCallback(() => {
            if (actionErrorTimer.current !== null) {
              window.clearTimeout(actionErrorTimer.current)
              actionErrorTimer.current = null
            }
          }, [])
          const dismissActionError = useCallback(() => {
            clearActionErrorTimer()
            setActionError(null)
          }, [clearActionErrorTimer])
          const showActionError = useCallback((message) => {
            clearActionErrorTimer()
            // 收文案展示；显式传 null/undefined 直接清空（无可见残留）。
            setActionError(message ?? null)
            actionErrorTimer.current = window.setTimeout(() => {
              actionErrorTimer.current = null
              setActionError(null)
            }, 5000)
          }, [clearActionErrorTimer])
    
          const reload = useCallback(async () => {
            const seq = ++seqRef.current
            try {
              // 循环任务的完成实例单独拉；它失败不该把已经拿到的 list 一起判死。
              // 窗口覆盖「本月」并向后多留 62 天：循环任务可以提前完成本周期的那一次，
              // 周循环最多提前到本周日，月循环最多提前一个月，今天之后的实例也要能查到。
              const now = new Date()
              const todayKey = dateKeyOf(now)
              const weekStart = shiftKeyLocal(todayKey, 1 - isoWeekday(now))
              const monthStart = `${todayKey.slice(0, 7)}-01`
              const from = weekStart < monthStart ? weekStart : monthStart
              const to = shiftKeyLocal(todayKey, 62)
              const occTask = fetchApi('occurrences', { from, to }, tRef.current).catch((err) => {
                console.error('[dsh-inbox-planner todo] occurrences (done) failed', err)
                return { items: [] }
              })
              const noteTask = fetchApi('notesList', {}, tRef.current).catch((err) => {
                console.error('[dsh-inbox-planner todo] notesList failed', err)
                return { items: [] }
              })
              // 分类侧车（筛选面板用）：失败不拖死 list，行内 { name, count } 保序进下拉。
              const catTask = fetchApi('categories', {}, tRef.current).catch((err) => {
                console.error('[dsh-inbox-planner todo] categories (filter) failed', err)
                return { items: [] }
              })
              // list 载荷：搜索 / 分类 / 无分类 / 优先级四路 AND；空串与缺省键都不过滤（T8 契约）。
              const listPayload = {}
              if (query) listPayload.q = query
              if (fCategory) listPayload.category = fCategory
              if (fUncategorized) listPayload.uncategorized = true
              if (fPriority) listPayload.priority = fPriority
              const [result, occ, noteRes, catRes] = await Promise.all([fetchApi('list', listPayload, tRef.current), occTask, noteTask, catTask])
              if (seq !== seqRef.current) return
              setState({
                loading: false,
                error: null,
                items: Array.isArray(result.items) ? result.items : [],
                summary: result.summary && typeof result.summary === 'object' ? result.summary : {},
                notices: Array.isArray(result.notices) ? result.notices : [],
                staleDays: Number.isInteger(result.staleDays) ? result.staleDays : 7,
              })
              // 只取循环任务已完成的那次，按完成日期倒序进「已完成」分组。
              setRecurringDone((Array.isArray(occ?.items) ? occ.items : [])
                .filter((occurrence) => occurrence.repeat && occurrence.done)
                .sort((a, b) => b.date.localeCompare(a.date)))
              setNotes(Array.isArray(noteRes?.items) ? noteRes.items : [])
              // 与 setNotes 一样收在 seq 守卫内：过期响应（含旧筛选的组合）不得落进 state。
              setCategoryRows(Array.isArray(catRes?.items) ? catRes.items : [])
            } catch (err) {
              if (seq !== seqRef.current) return
              console.error('[dsh-inbox-planner todo] list failed', err)
              setState((prev) => ({ ...prev, loading: false, error: true }))
            }
          }, [query, fCategory, fUncategorized, fPriority])
    
          /** 写操作：返回 { ok: true } | { ok: false, error }，调用方（如 TodoDialog）据此决定要不要关闭/内联报错。 */
          const mutate = useCallback(async (method, payload) => {
            try {
              await fetchApi(method, payload, tRef.current)
              // 写成功后让日历和当天清单重拉 occurrences（它们都依赖 dataVersion）。
              dismissActionError()
              setDataVersion((v) => v + 1)
              await reload()
              return { ok: true }
            } catch (err) {
              console.error(`[dsh-inbox-planner todo] ${method} failed`, err)
              // 勾选/完成等写失败必须有可见反馈：独立的红条保留 5 秒，避免被
              // 随后成功的 2.5s 轮询立刻清掉；同时重新拉一次 list，让宿主把
              // notices 里的 write-error 带回来。
              showActionError(err?.message ?? '')
              await reload()
              return { ok: false, error: err }
            }
          }, [reload, dismissActionError, showActionError])
    
          /** 当天清单：只认 dayKey 与 dataVersion，打开 / 切回 / 写后都重新拉，不存快照。 */
          useEffect(() => {
            if (dayKey === null) {
              setDayItems([])
              return undefined
            }
            let alive = true
            fetchApi('occurrences', { from: dayKey, to: dayKey }, tRef.current)
              .then((result) => {
                if (!alive) return
                setDayItems(Array.isArray(result.items) ? result.items : [])
              })
              .catch((err) => {
                if (!alive) return
                console.error('[dsh-inbox-planner todo] occurrences failed', err)
                setDayItems([])
              })
            return () => { alive = false }
          }, [dayKey, dataVersion])
    
          /** 当天清单里勾选：complete 带 date；成功后 dataVersion 自增，清单自己重拉。 */
          const toggleDayItem = useCallback((item) => (
            mutate('complete', { id: item.todoId, done: !item.done, date: item.date })
          ), [mutate])
    
          /** 把内存里的改动重试落盘；成功后 reload，宿主清掉 writeError，提示条随之消失。 */
          const retryWrite = useCallback(async () => {
            if (retrying) return
            setRetrying(true)
            try {
              await fetchApi('retry', {}, tRef.current)
              await reload()
            } catch (err) {
              console.error('[dsh-inbox-planner todo] retry write failed', err)
            } finally {
              setRetrying(false)
            }
          }, [reload, retrying])
    
          // 便签坞操作：快速输入回车提交、行内编辑保存、删除。
          // mutate 返回 { ok }，noteAdd 失败即不落输入：快速输入保持不动，由用户重试。
          const addQuickNote = useCallback(async (event) => {
            event.preventDefault()
            const text = quickNote.trim()
            if (text === '' || text.length > 500) return
            const res = await mutate('noteAdd', { text })
            if (!res.ok) return
            setQuickNote('')
            if (noteInputRef.current) noteInputRef.current.focus()
          }, [mutate, quickNote])
    
          const updateNote = useCallback(async (note, text) => {
            const clean = text.trim()
            setEditingNote(null)
            if (clean === '' || clean === note.text) return
            await mutate('noteUpdate', { id: note.id, text: clean })
          }, [mutate])
    
          const removeNote = useCallback(async (note) => {
            await mutate('noteRemove', { id: note.id })
          }, [mutate])
    
          useEffect(() => { void reload() }, [reload])
    
          useEffect(() => {
            const tick = () => {
              if (document.visibilityState === 'visible') void reload()
            }
            const timer = window.setInterval(tick, 2500)
            document.addEventListener('visibilitychange', tick)
            return () => {
              window.clearInterval(timer)
              document.removeEventListener('visibilitychange', tick)
            }
          }, [reload])
    
          // 换选另一条时：先取消上一条的自动撤回计时，再复位「确认删除」。
          useEffect(() => {
            clearConfirmTimer()
            setConfirming(false)
          }, [selected, clearConfirmTimer])
    
          // 卸载时清掉计时器，避免组件没了还 setConfirming / setActionError。
          useEffect(() => () => clearConfirmTimer(), [clearConfirmTimer])
          useEffect(() => () => clearActionErrorTimer(), [clearActionErrorTimer])
    
          const items = state.items
          const now = new Date()
          const todayKey = dateKeyOf(now)
          const weekStart = shiftKeyLocal(todayKey, 1 - isoWeekday(now))   // 本周一
          const weekEnd = shiftKeyLocal(weekStart, 6)                        // 本周日
          const monthStart = `${todayKey.slice(0, 7)}-01`
          const monthEnd = dateKeyOf(new Date(now.getFullYear(), now.getMonth() + 1, 0))  // 本月最后一天
          const rangeStart = doneRange === 'today' ? todayKey : doneRange === 'week' ? weekStart : monthStart
          // 上界按范围各自取：今天 / 本周日 / 本月最后一天。预完成的未来实例因此只出现在
          // 「本周」「本月」里；「今天」仍只认今天，不会把 10-30 提前算进今天。
          const rangeEnd = doneRange === 'today' ? todayKey : doneRange === 'week' ? weekEnd : monthEnd
          const pendingCount = items.filter((item) => item.done && item.doneBy === 'agent' && !item.verifiedAt).length
    
          // 首次出现未核实项（0 → N）时把「已完成」展开，否则标记藏在折叠区里没人看得见。
          // 用户手动操作过（doneTouched）就不再自动展开，徽标仍然照常更新。
          useEffect(() => {
            if (pendingCount > 0 && prevPending.current === 0 && !doneTouched.current) setDoneOpen(true)
            prevPending.current = pendingCount
          }, [pendingCount])
    
          // 两路完成数据都先按当前范围裁剪；组内的 今天/昨天/本周/更早 分节逻辑不变。
          // 旧数据没有 doneAt：只在最宽的「本月」里保留，仍归入「更早」。
          const inDoneRange = (key) => key !== null && key >= rangeStart && key <= rangeEnd
          const allDoneItems = items.filter((item) => item.bucket === 'done')
          const doneItems = allDoneItems.filter((item) => {
            const key = doneKeyOf(item)
            return key === null ? doneRange === 'month' : inDoneRange(key)
          })
          const recurringDoneInRange = recurringDone.filter((occurrence) => {
            const key = asText(occurrence.date)
            return parseDateKey(key) !== null && inDoneRange(key)
          })
          const doneTotal = doneItems.length + recurringDoneInRange.length
          const hasDoneData = allDoneItems.length + recurringDone.length > 0
          const openGroups = ORDER
            .filter((bucket) => bucket !== 'done' && bucket !== 'ended')
            .map((bucket) => ({ bucket, items: items.filter((item) => item.bucket === bucket) }))
            .filter((group) => group.items.length > 0)
          // 已结束的循环系列：独立折叠区，不占 openGroups；默认 open 视图那路也不含它们。
          const endedItems = items.filter((item) => item.bucket === 'ended')
          const doneSections = ['today', 'yesterday', 'week', 'earlier']
            .map((bucket) => ({ bucket, items: doneItems.filter((item) => doneGroupOf(item) === bucket) }))
            .filter((section) => section.items.length > 0)
          const selectedItem = items.find((item) => item.id === selected) ?? null
          const toggleItem = (item) => {
            const payload = { id: item.id, done: !item.done }
            if (item.isRepeating) {
              if (!item.dueDate) return          // 本周期没有待完成实例（系列已结束），不可勾
              // 勾的是本周期这一次（dueDate），不是下一个未完成实例（nextDue）：
              // 漏做时 nextDue 已滚到下周，用它会把下周那次误标成完成。
              payload.date = item.dueDate
            }
            void mutate('complete', payload)
          }
          const renderRow = (item) => h(Row, {
            key: item.id, item, t,
            selected: item.id === selected,
            onSelect: setSelected,
            onToggle: toggleItem,
          })
          // 循环任务的完成记录只出现在「已完成」里：勾掉复选框等于撤销那一次的完成，
          // 该行随 reload 消失，任务重新出现在列表的对应周期里。
          const renderRecurringDone = (occurrence) => {
            const title = asText(occurrence.title)
            const date = asText(occurrence.date)
            const undo = () => {
              void mutate('complete', { id: occurrence.todoId, done: false, date: occurrence.date })
            }
            return h('div', { key: `${occurrence.todoId}-${occurrence.date}`, style: S.recurringDoneRow },
              // 优先级色条与主列表行同构；无优先级时用透明占位，保证组内复选框左边缘对齐。
              h('span', {
                'aria-hidden': 'true',
                style: {
                  width: 3, height: 16, borderRadius: 2, flex: 'none',
                  background: occurrence.priority ? priorityColor(occurrence.priority) : 'transparent',
                },
              }),
              checkHit(undo, h('span', {
                role: 'checkbox',
                'aria-checked': 'true',
                'aria-label': title,
                tabIndex: 0,
                className: 'td-check',
                style: S.cbDone,
                onKeyDown: (event) => {
                  if (event.nativeEvent?.isComposing === true) return
                  if (event.key !== ' ' && event.key !== 'Enter') return
                  event.preventDefault()
                  event.stopPropagation()
                  undo()
                },
              }, h('svg', { width: 9, height: 9, viewBox: '0 0 16 16', fill: 'none', stroke: 'var(--dsw-alias-label-primary-inverted)', strokeWidth: 2.4 },
                h('path', { d: 'M3.4 8.4 6.2 11l6.4-6.4', strokeLinecap: 'round', strokeLinejoin: 'round' })))),
              h('span', { style: S.nmDone, title }, title),
              h('span', { style: S.repeatBadge }, t('repeatBadge')),
              h('span', { style: S.due, title: `${t('completedOn')} ${date}` }, date.slice(5)),
            )
          }
          // 已结束循环行：与 renderRecurringDone 同构的优先级色条（无优先级用透明占位）。
          // 行上没有复选框，点击只选中；编辑/删除在详情里，完成按钮置灰（selectedRepeatEnded）。
          const renderEndedRow = (item) => {
            const keys = Object.keys(item.completions ?? {}).sort()
            // 预完成可能留下未来日期键，不算「上次完成」；全是未来键时回退最大键保持展示。
            const pastKeys = keys.filter((k) => k <= dateKeyOf(new Date()))
            const lastCompletion = pastKeys.length > 0 ? pastKeys[pastKeys.length - 1] : (keys.length > 0 ? keys[keys.length - 1] : '')
            return h('div', {
              key: item.id,
              className: 'td-note-row',
              style: S.endedRow,
              onClick: () => setSelected(item.id),
            },
              h('span', { 'aria-hidden': 'true', style: { width: 3, height: 16, borderRadius: 2, flex: 'none', background: item.priority ? priorityColor(item.priority) : 'transparent' } }),
              h('span', { style: S.nm }, asText(item.title)),
              h('span', { style: S.tag }, t('endedBadge')),
              h('span', { style: S.due }, lastCompletion ? `${t('lastCompleted')} ${lastCompletion.slice(5)}` : ''),
            )
          }
    
          const selectedTitle = selectedItem ? asText(selectedItem.title) : ''
          const selectedNote = selectedItem ? asText(selectedItem.note) : ''
          const selectedDueDate = selectedItem ? asText(selectedItem.dueDate) : ''
          const selectedDueTime = selectedItem ? asText(selectedItem.dueTime) : ''
          const selectedCategory = selectedItem ? asText(selectedItem.category) : ''
          // 手改 JSON 可能让 completions 变成任意类型；详情只按对象兜底，坏值当「还没完成过」。
          const selectedCompletions = selectedItem !== null && selectedItem.isRepeating
            && selectedItem.completions !== null
            && typeof selectedItem.completions === 'object'
            && !Array.isArray(selectedItem.completions)
            ? selectedItem.completions
            : {}
          const selectedCompletionKeys = Object.keys(selectedCompletions).sort()
          const selectedLastCompleted = selectedCompletionKeys.length === 0
            ? ''
            : selectedCompletionKeys[selectedCompletionKeys.length - 1]
          const selectedRepeatEnded = Boolean(selectedItem?.isRepeating && !selectedItem?.dueDate)
          const selectedCompletionCount = selectedCompletionKeys.length
          const selectedCountLabel = `${t('completedTimes').replace('{n}', String(selectedCompletionCount))}${selectedRepeatEnded ? ` · ${t('seriesEnded')}` : ''}`
    
          // 页头筛选按钮的激活文案：无分类优先代表分类轴；优先级轴独立在后。完整摘要进 title。
          const filterActive = fCategory !== '' || fUncategorized || fPriority !== ''
          const filterSummary = [
            fUncategorized ? t('noCategory') : (fCategory !== '' ? fCategory : ''),
            fPriority !== '' ? priorityLabel(fPriority, t) : '',
          ].filter(Boolean).join(' · ')
    
          return h('div', { style: S.page },
            h('div', { style: S.head },
              h('h2', { style: { ...S.h1, whiteSpace: 'nowrap', flexShrink: 0 } }, t('title')),
              __inboxBridge.SyncIcon ? h(__inboxBridge.SyncIcon, { t: __inboxBridge.t, onDone: reload }) : null,
              h('span', { style: S.count }, `${t('today')} ${state.summary.today ?? 0} · ${t('overdue')} ${state.summary.overdue ?? 0} · ${t('stale')} ${state.summary.stale ?? 0} · ${t('unplanned')} ${state.summary.unplanned ?? 0}`),
              h('div', { style: S.grow }),
              h('button', {
                className: 'td-btn td-elevated',
                style: S.addBtn,
                onClick: () => setDialog({ initial: null }),
              }, `+ ${t('new')}`),
              h('button', {
                className: 'td-btn',
                style: S.addBtn,
                onClick: () => setCategoryOpen(true),
              }, t('category')),
              h('div', { style: S.viewSeg }, [
                ['list', 'listView'],
                ['calendar', 'calendarView'],
              ].map(([value, key]) => h('button', {
                key: value,
                type: 'button',
                className: 'td-btn',
                'aria-pressed': view === value ? 'true' : 'false',
                style: { ...S.segItem, ...(view === value ? S.segItemOn : null) },
                onClick: () => {
                  setView(value)
                  // 切回列表时清掉按天选择，详情列恢复成选中项详情。
                  if (value === 'list') setDayKey(null)
                },
              }, t(key)))),
              // 筛选入口在搜索框左侧（其余控件不动）：外层 div 是锚容器，把触发钮与面板
              // 包在一起——useAnchoredPopover 的点外关闭只认同一个 ref 容器；Esc 在容器上
              // 拦截，避免穿透。hover 层级与日期/分类弹层一致（同 hook，同 .td-pop 外观）。
              h('div', {
                ref: filterPop.anchorRef,
                style: { position: 'relative' },
                onKeyDown: (event) => {
                  if (!filterOpen || event.key !== 'Escape') return
                  event.stopPropagation?.()
                  setFilterOpen(false)
                },
              },
              h('button', {
                type: 'button',
                className: 'td-btn',
                style: S.filterBtn,
                ref: headFilterRef,
                'aria-haspopup': 'dialog',
                'aria-expanded': filterOpen ? 'true' : 'false',
                title: filterSummary,
                onClick: () => setFilterOpen((open) => !open),
              },
              h('span', {
                style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
              }, filterActive ? `${t('filter')} · ${filterSummary}` : t('filter')),
              filterActive
                ? h('span', {
                    // 浏览器禁 button 套 button：× 用 role="button" 的 span，stopPropagation
                    // 防止这次点击冒泡进触发钮的 toggle 把面板再次打开。
                    role: 'button',
                    className: 'td-btn',
                    style: S.filterClear,
                    title: t('clearValue'),
                    'aria-label': t('clearValue'),
                    tabIndex: 0,
                    onClick: (event) => {
                      event.stopPropagation()
                      setFCategory('')
                      setFUncategorized(false)
                      setFPriority('')
                    },
                    // 键盘可达：Enter / 空格与点击同效（防止原生冒泡把触发钮一并触发）。
                    onKeyDown: (event) => {
                      if (event.nativeEvent?.isComposing === true) return
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      event.stopPropagation()
                      setFCategory('')
                      setFUncategorized(false)
                      setFPriority('')
                    },
                  }, '×')
                : null),
              filterOpen
                ? h('div', {
                    className: filterPop.up ? 'td-pop td-pop-up' : 'td-pop',
                    style: filterPop.popStyle,
                    role: 'dialog',
                    'aria-label': t('filter'),
                  },
                  h('div', { style: S.popList },
                    h('div', { style: S.popGroup }, t('category')),
                    h('button', {
                      type: 'button',
                      className: 'td-btn',
                      style: fCategory === '' && !fUncategorized ? { ...S.popItem, ...S.segItemOn } : S.popItem,
                      'aria-pressed': fCategory === '' && !fUncategorized ? 'true' : 'false',
                      onClick: () => {
                        setFCategory('')
                        setFUncategorized(false)
                        setFilterOpen(false)
                      },
                    }, t('all')),
                    h('button', {
                      type: 'button',
                      className: 'td-btn',
                      style: fUncategorized ? { ...S.popItem, ...S.segItemOn } : S.popItem,
                      'aria-pressed': fUncategorized ? 'true' : 'false',
                      onClick: () => {
                        setFUncategorized(true)
                        setFCategory('')
                        setFilterOpen(false)
                      },
                    }, t('noCategory')),
                    categoryRows.map((row) => {
                      // 侧车是原样数组：脏行（非字符串名）按空名跳过，与分类同名待办互不影响。
                      const name = asText(row?.name)
                      if (name === '') return null
                      const selected = !fUncategorized && fCategory === name
                      return h('button', {
                        key: name,
                        type: 'button',
                        className: 'td-btn',
                        style: selected ? { ...S.popItem, ...S.segItemOn } : S.popItem,
                        'aria-pressed': selected ? 'true' : 'false',
                        title: name,
                        onClick: () => {
                          setFCategory(name)
                          setFUncategorized(false)
                          setFilterOpen(false)
                        },
                      }, h('span', {
                        style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                      }, name))
                    }),
                    h('div', { style: S.popSep, 'aria-hidden': 'true' }),
                    h('div', { style: S.popGroup }, t('priority')),
                    // 「全部」行：清 fPriority→不筛（读写双向都有行，fPriority='' 时本轴有选中态）。
                    h('button', {
                      key: 'all',
                      type: 'button',
                      className: 'td-btn',
                      style: fPriority === '' ? { ...S.popItem, ...S.segItemOn } : S.popItem,
                      'aria-pressed': fPriority === '' ? 'true' : 'false',
                      onClick: () => {
                        setFPriority('')
                        setFilterOpen(false)
                      },
                    }, t('all')),
                    ['high', 'medium', 'low'].map((value) => h('button', {
                      key: value,
                      type: 'button',
                      className: 'td-btn',
                      style: fPriority === value ? { ...S.popItem, ...S.segItemOn } : S.popItem,
                      'aria-pressed': fPriority === value ? 'true' : 'false',
                      onClick: () => {
                        setFPriority(value)
                        setFilterOpen(false)
                      },
                    }, priorityLabel(value, t))),
                  ))
                : null),
              h('input', {
                className: 'td-input',
                style: S.search, placeholder: t('search'), value: query,
                onChange: (e) => setQuery(e.target.value),
              }),
            ),
            state.notices.includes('corrupt') && !noticeHidden
              ? h('div', { style: S.warn },
                h('span', { style: { flex: 1 } }, t('corruptNotice')),
                h('button', {
                  className: 'td-btn',
                  style: S.noticeClose, 'aria-label': t('dismiss'),
                  onClick: () => { corruptDismissed = true; setNoticeHidden(true) },
                }, '×'))
              : null,
            state.notices.includes('write-error')
              ? h('div', { style: S.warn },
                h('span', { style: { flex: 1 } }, t('writeNotice')),
                h('button', {
                  type: 'button',
                  className: 'td-btn td-elevated',
                  disabled: retrying,
                  style: { ...S.addBtn, height: 26, padding: '0 8px', flex: 'none', cursor: retrying ? 'default' : 'pointer' },
                  onClick: () => void retryWrite(),
                }, t('retryWrite')))
              : null,
            actionError
              ? h('div', { role: 'alert', style: S.error }, `操作失败：${actionError}`)
              : null,
            state.error
              ? h('div', { style: S.error }, `${t('failed')}　`, h('button', {
                type: 'button',
                className: 'td-btn',
                style: { padding: '1px 8px', border: 'none', borderRadius: 4, color: 'inherit', fontSize: 12, cursor: 'pointer' },
                onClick: () => void reload(),
              }, t('retry')))
              : null,
            h('div', { style: S.body },
              view === 'calendar'
                ? h(CalendarView, { t, selectedDay: dayKey, onPickDay: (key) => setDayKey(key), version: dataVersion })
                : h('div', { style: S.list },
                  state.loading && items.length === 0
                    ? h('div', { style: S.empty }, t('loading'))
                    : items.length === 0
                      ? (query !== '' || filterActive
                        // 空态三分支：搜索优先（noMatch），其次筛选空，最后才是 idle 的两段引导。
                        ? h('div', { style: S.empty }, query !== '' ? t('noMatch') : t('filterEmpty'))
                        : h('div', { style: S.empty },
                          h('div', null, t('empty')),
                          h('div', { style: { marginTop: 12 } },
                            h('button', {
                              className: 'td-btn td-elevated',
                              style: S.addBtn,
                              onClick: () => setDialog({ initial: null }),
                            }, t('emptyHint')))))
                      : h('div', null,
                        openGroups.map((group) => h('div', { key: group.bucket },
                          h('div', { style: S.sec },
                            h('span', { style: S.secT }, t(group.bucket)),
                            h('span', { style: S.secN }, String(group.items.length)),
                            group.bucket === 'stale' ? h('span', { style: { ...S.tag, color: 'var(--dsw-alias-state-error-primary)' } }, t('staleHint').replace('{n}', String(state.staleDays))) : null,
                            h('span', { style: S.line }),
                          ),
                          group.items.map((item) => renderRow(item)),
                        )),
                        endedItems.length > 0
                          ? h('div', { key: 'ended' },
                            h('div', { style: S.sec },
                              h('button', {
                                type: 'button', className: 'td-btn', style: S.doneToggle,
                                'aria-expanded': endedOpen ? 'true' : 'false',
                                onClick: () => setEndedOpen((open) => !open),
                              },
                                h('span', { style: S.secT }, t('endedGroup')),
                                h('span', { style: S.secN }, String(endedItems.length)),
                              ),
                              h('span', { style: S.line }),
                              h('span', { style: { ...S.tag, color: 'var(--dsw-alias-label-tertiary)' } }, endedOpen ? '▾' : '▸'),
                            ),
                            endedOpen
                              ? h('div', null, endedItems.map((item) => renderEndedRow(item)))
                              : null,
                          )
                          : null,
                        hasDoneData ? h('div', { key: 'done' },
                          h('div', { style: S.doneHead },
                            h('button', {
                              className: 'td-btn',
                              style: S.doneToggle,
                              'aria-expanded': doneOpen ? 'true' : 'false',
                              onClick: () => {
                                doneTouched.current = true
                                setDoneOpen((open) => !open)
                              },
                            },
                            h('span', { style: S.secT }, t('done')),
                            h('span', { style: S.secN }, String(doneTotal)),
                            pendingCount > 0
                              ? h('span', { style: { ...S.tag, color: 'var(--dsw-alias-state-warn-primary)' } }, `${pendingCount} ${t('needsReview')}`)
                              : null),
                            // 范围控件放在计数之后、箭头之前：点它只切范围，不触发折叠。
                            h('div', { style: S.doneRange, role: 'group', 'aria-label': t('done') },
                              ['today', 'week', 'month'].map((value) => h('button', {
                                key: value,
                                type: 'button',
                                className: 'td-btn',
                                'aria-pressed': doneRange === value ? 'true' : 'false',
                                style: { ...S.doneRangeItem, ...(doneRange === value ? S.doneRangeItemOn : null) },
                                onClick: () => setDoneRange(value),
                              }, t(value)))),
                            h('span', { style: S.line }),
                            h('button', {
                              type: 'button',
                              className: 'td-btn',
                              style: S.doneArrow,
                              'aria-expanded': doneOpen ? 'true' : 'false',
                              'aria-label': t('done'),
                              onClick: () => {
                                doneTouched.current = true
                                setDoneOpen((open) => !open)
                              },
                            }, doneOpen ? '▾' : '▸'),
                          ),
                          doneOpen
                            ? (doneTotal === 0
                              ? h('div', { style: S.doneEmpty }, t('doneEmpty'))
                              : doneSections.map((section) => h('div', { key: section.bucket },
                                h('div', { style: S.subsec },
                                  h('span', { style: S.secT }, t(section.bucket)),
                                  h('span', { style: S.secN }, String(section.items.length)),
                                  h('span', { style: S.line }),
                                ),
                                section.items.map((item) => renderRow(item)),
                              )).concat(recurringDoneInRange.length === 0 ? [] : [
                                h('div', { key: 'recurring-done' },
                                  h('div', { style: S.subsec },
                                    h('span', { style: S.secT }, t('recurringDoneSection')),
                                    h('span', { style: S.secN }, String(recurringDoneInRange.length)),
                                    h('span', { style: S.line }),
                                  ),
                                  recurringDoneInRange.map((occurrence) => renderRecurringDone(occurrence)),
                                ),
                              ]))
                            : null,
                        ) : null,
                      ),
                ),
              h('div', { style: S.rightCol },
                h('div', { style: S.detail },
                  dayKey !== null
                    ? h('div', null,
                      h('div', { style: S.detailTitle }, t('plansOnDay')(dayKey === todayKey ? t('today') : dayKey.slice(5))),
                      dayItems.length === 0
                        ? h('div', { style: S.empty }, t('nothingThatDay'))
                        : dayItems.map((item) => h('div', {
                            key: `${item.todoId}-${item.date}`,
                            style: S.dayRow,
                          },
                          checkHit(
                            () => { void toggleDayItem(item) },
                            h('span', {
                              role: 'checkbox',
                              'aria-checked': item.done ? 'true' : 'false',
                              'aria-label': asText(item.title),
                              tabIndex: 0,
                              className: 'td-check',
                              style: item.done ? S.cbDone : S.cb,
                              onKeyDown: (event) => {
                                if (event.nativeEvent?.isComposing === true) return
                                if (event.key !== ' ' && event.key !== 'Enter') return
                                event.preventDefault()
                                event.stopPropagation()
                                void toggleDayItem(item)
                              },
                            }, item.done
                              ? h('svg', { width: 9, height: 9, viewBox: '0 0 16 16', fill: 'none', stroke: 'var(--dsw-alias-label-primary-inverted)', strokeWidth: 2.4 },
                                  h('path', { d: 'M3.4 8.4 6.2 11l6.4-6.4', strokeLinecap: 'round', strokeLinejoin: 'round' }))
                              : null),
                          ),
                          h('span', { style: item.done ? S.nmDone : S.nm }, asText(item.title)),
                          h('span', { style: { ...S.dot, background: priorityColor(item.priority), marginLeft: 4 }, 'aria-hidden': 'true' }))),
                      h('button', {
                        type: 'button',
                        className: 'td-btn',
                        style: { ...S.btnGhost, width: '100%', marginTop: 10 },
                        onClick: () => setDialog({ initial: { dueDate: dayKey } }),
                      }, t('newOnThatDay')))
                    : selectedItem
                      ? h('div', null,
                        h('div', { style: S.detailTitle }, selectedTitle),
                        selectedNote !== '' ? h('div', { style: { marginBottom: 10, lineHeight: '20px', whiteSpace: 'pre-wrap' } }, selectedNote) : null,
                        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 } },
                          selectedItem.priority
                            ? detailRow(t('priority'), h('span', {
                                style: {
                                  padding: '1px 8px', borderRadius: 999,
                                  color: priorityColor(selectedItem.priority),
                                  background: `color-mix(in srgb, ${priorityColor(selectedItem.priority)} 12%, transparent)`,
                                },
                              }, priorityLabel(selectedItem.priority, t)))
                            : null,
                          selectedDueDate !== '' ? detailRow(t('dueDate'), `${selectedDueDate}${selectedDueTime !== '' ? ' ' + selectedDueTime : ''}`) : null,
                          selectedCategory !== '' ? detailRow(t('category'), selectedCategory) : null,
                          selectedItem.createdAt ? detailRow(t('created'), formatDateTime(selectedItem.createdAt)) : null,
                          selectedItem.isRepeating
                            ? detailRow(t('lastCompleted'), selectedLastCompleted === '' ? t('neverCompleted') : selectedLastCompleted.slice(5))
                            : null,
                          selectedItem.isRepeating
                            ? detailRow(t('repeatBadge'), selectedCountLabel)
                            : null),
                        h('div', { style: { display: 'flex', gap: 8, marginTop: 14, justifyContent: 'center' } },
                          h('button', {
                            className: 'td-btn',
                            style: { ...S.btnGhost, minWidth: 76 },
                            onClick: () => setDialog({ initial: selectedItem }),
                          }, t('edit')),
                          h('button', {
                            className: 'td-primary',
                            disabled: selectedRepeatEnded,
                            style: { ...S.btnPrimary, minWidth: 104, opacity: selectedRepeatEnded ? 0.45 : 1, cursor: selectedRepeatEnded ? 'not-allowed' : 'pointer' },
                            onClick: () => {
                              const payload = { id: selectedItem.id, done: !selectedItem.done }
                              if (selectedItem.isRepeating && selectedItem.dueDate) payload.date = selectedItem.dueDate
                              void mutate('complete', payload)
                            },
                          }, selectedItem.done ? t('reopen') : (selectedItem.isRepeating ? t('completeOccurrence') : t('complete'))),
                          h('button', {
                            className: 'td-btn',
                            style: { ...S.btnGhost, minWidth: 76, color: confirming ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-label-secondary)' },
                            onClick: async () => {
                              // 进入或结束确认态之前都先清掉旧 timer，保证只剩当前这一轮。
                              clearConfirmTimer()
                              if (!confirming) {
                                setConfirming(true)
                                confirmTimer.current = window.setTimeout(() => {
                                  confirmTimer.current = null
                                  setConfirming(false)
                                }, 3000)
                                return
                              }
                              setConfirming(false)
                              // 失败则保留选中等用户再试，成功才收起详情。
                              const res = await mutate('remove', { id: selectedItem.id })
                              if (res.ok) setSelected(null)
                            },
                          }, confirming ? t('confirmRemove') : t('remove')),
                        ),
                        selectedItem.done && selectedItem.doneBy === 'agent' && !selectedItem.verifiedAt
                          ? h('button', {
                              className: 'td-primary',
                              style: { width: '100%', height: 32, marginTop: 8, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--dsw-alias-state-business-primary)', color: 'var(--dsw-alias-label-primary-inverted)', fontSize: 12.5 },
                              onClick: () => void mutate('confirm', { id: selectedItem.id }),
                            }, t('confirmDone'))
                          : null,
                      )
                      : h('div', { style: S.detailEmpty }, h('div', null, t('pickOne'))),
                ),
                h('div', { className: 'td-dock', style: S.dock },
                  h('div', { className: 'td-dock-head', style: S.dockHead },
                  h('span', { style: S.dockTitle }, t('quickNote')),
                  h('span', { style: S.dockCount }, notes.length > 0 ? ` · ${notes.length}` : ''),
                  ),
                  h('div', { style: S.dockBody },
                      [
                        h('form', { key: 'quick', style: { flex: 'none', display: 'flex', marginBottom: 8 }, onSubmit: addQuickNote },
                          h('input', {
                            className: 'td-input',
                            style: { flex: 1, height: 30, border: '0.5px solid var(--dsw-alias-border-l3)', borderRadius: 8, padding: '0 10px', fontSize: 12.5, color: 'var(--dsw-alias-label-primary)', background: 'transparent', outline: 'none' },
                            ref: noteInputRef,
                            placeholder: t('noteAddPlaceholder'),
                            maxLength: 500,
                            value: quickNote,
                            onChange: (e) => setQuickNote(e.target.value),
                            'aria-label': t('quickNote'),
                          })),
                        h('div', { key: 'list', style: { flex: 1, minHeight: 0, overflowY: 'auto' } },
                          notes.length === 0
                            ? h('div', { style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 12, textAlign: 'center', padding: '24px 0' } }, t('noteEmpty'))
                            : notes.map((note) => editingNote === note.id
                              ? h('div', { key: note.id, className: 'td-note-row', style: { display: 'flex', gap: 6, padding: '5px 8px', borderRadius: 6 } },
                                h('input', {
                                  className: 'td-input',
                                  style: { flex: 1, minWidth: 0, border: '0.5px solid var(--dsw-alias-state-business-primary)', borderRadius: 6, padding: '3px 8px', fontSize: 12.5, color: 'var(--dsw-alias-label-primary)', outline: 'none', background: 'transparent' },
                                  defaultValue: note.text,
                                  maxLength: 500,
                                  autoFocus: true,
                                  onKeyDown: (event) => {
                                    if (event.nativeEvent?.isComposing === true) return
                                    // 收尾（Enter/Escape）都会随重渲卸载这个 input；主流引擎对被移除的
                                    // 聚焦元素不派发 blur → onBlurCapture 永不触发 → dockFocusRef 残留。
                                    // 先同步真实 blur（relatedTarget=null，按坞外清 ref 收口）再走原收尾。
                                    if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); void updateNote(note, event.currentTarget.value) }
                                    if (event.key === 'Escape') { event.preventDefault(); discardNoteRef.current.add(note.id); event.currentTarget.blur(); setEditingNote(null) }
                                  },
                                  onBlur: (event) => {
                                    // Esc 丢弃：清标记、跳过保存；清空编辑态由 Esc 分支在
                                    // blur 之后照旧 setEditingNote(null)，这里不再翻一次状态。
                                    if (discardNoteRef.current.delete(note.id)) { return }
                                    void updateNote(note, event.currentTarget.value)
                                  },
                                }))
                              : h('div', {
                                key: note.id,
                                className: 'td-note-row',
                                style: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 6 },
                              },
                              h('span', {
                                style: { flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: '19px', wordBreak: 'break-all', color: 'var(--dsw-alias-label-primary)', cursor: 'text' },
                                title: t('noteEditTitle'),
                                onClick: () => setEditingNote(note.id),
                              }, asText(note.text),
                              // 时间内联在文本流末尾（走查 R1）：随长文本换行贴在文末，不再右端漂移；
                              // 位于可点击 span 内，点击时间同样进入编辑。
                              h('span', { style: { marginLeft: 6, fontSize: 10.5, color: 'var(--dsw-alias-label-tertiary)' } }, noteRelTime(t, note.createdAt))),
                              // 悬停操作簇（走查 R2）：→待办 / ✕ 统一 18px 高、同规格内边距，垂直居中。
                              h('div', { style: { flex: 'none', display: 'flex', alignItems: 'center', gap: 4 } },
                                h('button', {
                                  className: 'td-note-act td-btn',
                                  style: { flex: 'none', height: 18, padding: '0 5px', fontSize: 11, lineHeight: '18px', display: 'inline-flex', alignItems: 'center', border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-tertiary)', cursor: 'pointer', borderRadius: 4 },
                                  title: t('toTodo'),
                                  'aria-label': t('toTodo'),
                                  onClick: () => setDialog({ initial: { title: note.text } }),
                                }, '→ ' + t('todo')),
                                h('button', {
                                  className: 'td-note-act td-btn',
                                  style: { flex: 'none', height: 18, padding: '0 5px', fontSize: 11, lineHeight: '18px', display: 'inline-flex', alignItems: 'center', border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-tertiary)', cursor: 'pointer', borderRadius: 4 },
                                  title: t('noteDeleteTitle'),
                                  'aria-label': t('noteDeleteTitle'),
                                  onClick: () => void removeNote(note),
                                }, '✕'),
                              ),
                            ))),
                    ]),
                ),
              ),
            ),
            dialog !== null
              ? h(TodoDialog, {
                  t,
                  initial: dialog.initial,
                  mutate,
                  onClose: () => setDialog(null),
                  onSaved: () => setDialog(null),
                  onManageCategories: () => setCategoryOpen(true),
                  escSuspended: categoryOpen,
                })
              : null,
            categoryOpen
              ? h(CategoryDialog, {
                  t,
                  onClose: () => setCategoryOpen(false),
                  onChanged: reload,
                })
              : null,
          )
        }
    
        function TodoIcon({ size = 16 }) {
          return h('svg', {
            width: size, height: size, viewBox: '0 0 16 16', fill: 'none',
            stroke: 'currentColor', strokeWidth: 1.4, 'aria-hidden': true,
          },
          h('rect', { x: 2.4, y: 2.4, width: 11.2, height: 11.2, rx: 2.4 }),
          h('path', { d: 'M5.4 8.2l1.9 1.9 3.4-3.6', strokeLinecap: 'round', strokeLinejoin: 'round' }))
        }
    
        return {
          inject: ['slots'],
          apply(ctx) {
            ctx.effect(() => ensureStyles(), 'dsh-sidebar-todo: styles')
    
            const locale = ctx.get('locale')
            let t = (key) => dict.en[key] ?? dict.zh[key] ?? key
            if (locale) {
              ctx.effect(() => locale.register(NS, dict), 'dsh-sidebar-todo: dictionaries')
              t = locale.bind(NS)
            }
    
            ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
              name: 'sidebar.panellist', id: 'inbox-todo', order: 20,
              label: () => t('nav'), locale: NS, inject: () => ({ t }),
            }, ({ size } = {}) => h(__inboxBridge.BadgedIcon, null, h(TodoIcon, { size: size ?? 16 }))))
    
            ctx.slots.inject('main', () => ctx.slots.register({
              name: 'main', key: 'inbox-todo', locale: NS, inject: () => ({ t }),
            }, TodoPage))
          },
        }
      },
    })
    const todo = __todoModule.factory(require)

    return {
      inject: ['slots'],
      // Pure helpers, reachable by the test suite only.
      _test: { dueReminders, inQuiet, badge },
      apply(ctx) {
        ctx.effect(() => ensureSpinStyle(), 'dsh-inbox-planner: styles')
        const dict = buildDict()
        const locale = ctx.get('locale')
        let lookup = (key) => dict.zh[key] ?? key
        if (locale && typeof locale.register === 'function') {
          ctx.effect(() => locale.register(NS, dict), 'dsh-inbox-planner: dictionaries')
          lookup = locale.bind(NS)
        }
        // Function-valued strings (unsaved(n), defaultIs(v)) are not dictionary values; resolve them by language.
        const t = (key) => {
          if (typeof UI.zh[key] === 'function') return (lookup('__lang') === 'en' ? UI.en : UI.zh)[key]
          return lookup(key)
        }
        __inboxBridge.t = t
        __inboxBridge.SyncIcon = HeaderTools
        todo.apply(ctx)
        if (typeof window !== 'undefined' && typeof document !== 'undefined') ctx.effect(() => startReminders(t), 'dsh-inbox-planner: reminders')
        ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
          name: 'plugins.row.config',
          key: KEY,
        }, (props) => (props && props.view === 'summary' ? t('summary') : h(SettingsPage, { form: props && props.form, t }))))
      },
    }
  },
})
