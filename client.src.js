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
        syncRow: '立即同步邮件 → 待办', syncing: '正在同步…', syncFailed: '同步失败',
        syncDone: (n, m) => (n > 0 ? `新增 ${n} 条待办` : m > 0 ? `检查了 ${m} 封，没有新待办` : '没有新邮件'),
        loading: '正在读取设置…', unavailable: '宿主没有提供这一行的设置（插件未运行？）',
        readonly: '当前配置文件只读，不能在这里修改。',
        save: '保存', saving: '保存中…', saved: '已保存，立即生效', failed: '保存失败：宿主拒绝了这些值，已恢复为宿主的当前值',
        discard: '放弃修改', reset: '恢复默认', overridden: '已修改', unsaved: (n) => `${n} 项未保存`,
        on: '开', off: '关', defaultIs: (v) => `默认：${v}`, empty: '（空）',
        opt_language_auto: '跟随系统', opt_engine_auto: '自动（模型优先，失败用规则）', opt_zh: '中文', opt_en: 'English', opt_llm: '只用模型', opt_rules: '只用规则', opt_events: '只写需要到场的事', opt_all: '有日期的都写', opt_off: '不写', opt_system: '跟随上面的语言', opt_mail: '保留邮件原语言',
      },
      en: {
        summary: 'Mail that needs your action becomes dated to-dos with a calendar',
        syncRow: 'Sync mail → to-do now', syncing: 'Syncing…', syncFailed: 'Sync failed',
        syncDone: (n, m) => (n > 0 ? `${n} new to-do${n > 1 ? 's' : ''}` : m > 0 ? `${m} checked, nothing new` : 'No new mail'),
        loading: 'Loading settings…', unavailable: 'The host exposes no settings for this row (is the plugin running?)',
        readonly: 'The configuration file is read-only here.',
        save: 'Save', saving: 'Saving…', saved: 'Saved — applied immediately', failed: 'Not saved: the host rejected these values and its current values were restored',
        discard: 'Discard', reset: 'Reset', overridden: 'Changed', unsaved: (n) => `${n} unsaved`,
        on: 'On', off: 'Off', defaultIs: (v) => `Default: ${v}`, empty: '(empty)',
        opt_language_auto: 'Follow system', opt_engine_auto: 'Auto (model, rules fallback)', opt_zh: '中文', opt_en: 'English', opt_llm: 'Model only', opt_rules: 'Rules only', opt_events: 'Only things to attend', opt_all: 'Every dated item', opt_off: 'Never', opt_system: 'Same as above', opt_mail: 'Keep mail language',
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

    async function callApi(method) {
      const res = await fetch(new URL(`inbox-planner/api/${method}`, document.baseURI).href, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
      })
      const body = await res.json().catch(() => null)
      if (!body || !body.ok) throw new Error((body && body.error) || `HTTP ${res.status}`)
      return body.result
    }

    const ROW = { display: 'flex', alignItems: 'center', gap: 8, width: '100%', boxSizing: 'border-box', padding: '6px 10px', border: 'none', borderRadius: 6, background: 'transparent', color: 'var(--dsw-alias-label-primary)', fontSize: 13, textAlign: 'left', cursor: 'pointer' }

    /** A row in the sidebar's More menu: run one sync now, then open the To-do panel. */
    function SyncRow({ entries, onOpen, onDismiss, t }) {
      const [phase, setPhase] = useState({ kind: 'idle' })
      const [hover, setHover] = useState(false)
      const run = async () => {
        if (phase.kind === 'running') return
        setPhase({ kind: 'running' })
        try {
          const r = await callApi('sync')
          setPhase({ kind: r.ok ? 'done' : 'failed', created: r.created, scanned: r.scanned })
          setTimeout(() => {
            if (Array.isArray(entries) && entries.some((e) => e && e.id === 'inbox-todo') && typeof onOpen === 'function') onOpen('inbox-todo')
            if (typeof onDismiss === 'function') onDismiss()
          }, 900)
        } catch (error) {
          setPhase({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
        }
      }
      const label = phase.kind === 'running' ? t('syncing')
        : phase.kind === 'done' ? t('syncDone')(phase.created, phase.scanned)
          : phase.kind === 'failed' ? `${t('syncFailed')}${phase.message ? `: ${phase.message}` : ''}`
            : t('syncRow')
      return h('button', {
        type: 'button', role: 'menuitem', 'data-inbox-planner-sync': '',
        style: { ...ROW, background: hover ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent', color: phase.kind === 'failed' ? 'var(--dsw-alias-state-error-primary)' : ROW.color },
        onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
        onClick: () => void run(),
      },
      h('span', { 'aria-hidden': true, style: { width: 16, textAlign: 'center' } }, phase.kind === 'running' ? '⏳' : '📬'),
      h('span', null, label))
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

    function ensureSpinStyle() {
      if (typeof document === 'undefined' || document.querySelector('style[data-plugin-css="dsh-inbox-planner"]')) return () => {}
      const el = document.createElement('style')
      el.dataset.pluginCss = 'dsh-inbox-planner'
      el.textContent = '@keyframes inbox-planner-spin { to { transform: rotate(360deg) } }'
      document.head.appendChild(el)
      return () => el.remove()
    }

    // The To-do + calendar panel (adapted from dsh-sidebar-todo, MIT); see scripts/build-client.mjs.
    const __inboxBridge = { SyncIcon: null, t: null }
    const __todoModule = __TODO_MODULE__
    const todo = __todoModule.factory(require)

    return {
      inject: ['slots'],
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
        __inboxBridge.SyncIcon = SyncIcon
        todo.apply(ctx)
        ctx.slots.inject('sidebar.panellist.actions', () => ctx.slots.register({
          name: 'sidebar.panellist.actions', id: 'inbox-planner-sync', order: 5,
        }, (props) => h(SyncRow, { ...props, t })))
        ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
          name: 'plugins.row.config',
          key: KEY,
        }, (props) => (props && props.view === 'summary' ? t('summary') : h(SettingsPage, { form: props && props.form, t }))))
      },
    }
  },
})
