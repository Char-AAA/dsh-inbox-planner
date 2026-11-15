/*
 * dsh-inbox-planner — browser half (template).
 * scripts/build-client.mjs replaces __FIELDS__ / __GROUPS__ with lib/config.js's tables
 * and writes client.js. Edit this file, not client.js.
 *
 * DSH 0.2.2's Plugins page opens a row's configuration only when a client registers
 * `plugins.row.config` keyed `<package>#<row id>`; the page then renders that entry with
 * `{ view, form }`, where `form.state` is the Host's view of this row's volatile Config
 * and `form.mutate(ops, revision)` writes it (validated by the Host, applied live).
 */
window.__ModuleLoader__.load({
  id: 'dsh-inbox-planner',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useMemo } = React

    const NS = 'dsh-inbox-planner'
    const KEY = 'dsh-inbox-planner#inbox-planner'
    const FIELDS = __FIELDS__
    const GROUPS = __GROUPS__

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
    const __todoModule = __TODO_MODULE__
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
