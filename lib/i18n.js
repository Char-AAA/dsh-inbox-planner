/** The few strings this plugin writes into to-dos and reports. */

const M = {
  zh: {
    unknownSender: '未知发件人',
    prep: '准备',
    quote: '原文',
    location: '地点',
    conflict: (time, title) => `⚠️ 时间冲突：${time} 还有「${title}」`,
    timeUpdated: (subject) => `📧 时间已由新邮件更新：《${subject}》`,
    missingTools: (names) => `缺少工具 ${names.join(', ')}：请确认 dsh-email 和 dsh-sidebar-todo 已安装并启用`,
    noModel: '没有可用的模型（engine=llm）',
    rebaseline: '邮箱 uidValidity 变化，已重建基线',
    oauthPending: (n) => `邮箱「${n}」的 OAuth 还没登录，已跳过（在 设置 → 邮件 里登录）`,
    paused: '已暂停自动处理',
    resumed: '已恢复自动处理',
    neverRan: '还没运行过',
    head: (v) => `邮箱 ${v.account ?? '未知'} · 模型 ${v.model ?? '无（规则引擎）'} · ${v.paused ? '已暂停' : '运行中'} · 已处理 ${v.seen} 封`,
    run: (r) => `${r.at}（${r.reason}）：新邮件 ${r.scanned} 封，分析 ${r.processed}，噪音跳过 ${r.noise}，重复 ${r.duplicates}，新增 ${r.created.length}`,
    filled: (t) => `~ 补全时间：${t}`,
    calendar: (n) => `📅 同步到日历 ${n} 条`,
    calendarMissing: '有事项适合写进日历，但没有找到 dsh-calendar（未安装或未连接），只写了待办',
    decision: { noise: '噪音，跳过', none: '不需要处理', cc: '仅抄送，跳过', dup: '已在清单', todo: '→ 待办', 'todo+cal': '→ 待办 + 日历' },
    cmd: '立即检查新邮件，把需要处理的事写进待办',
  },
  en: {
    unknownSender: 'Unknown sender',
    prep: 'Prepare',
    quote: 'Quote',
    location: 'Where',
    conflict: (time, title) => `⚠️ Time clash: "${title}" at ${time}`,
    timeUpdated: (subject) => `📧 Time updated from a newer mail: "${subject}"`,
    missingTools: (names) => `Missing tools ${names.join(', ')}: make sure dsh-email and dsh-sidebar-todo are installed and enabled`,
    noModel: 'No model available (engine=llm)',
    rebaseline: 'Mailbox uidValidity changed; baseline rebuilt',
    oauthPending: (n) => `Mailbox "${n}" is not signed in via OAuth yet; skipped (sign in under Settings → Email)`,
    paused: 'Automatic processing paused',
    resumed: 'Automatic processing resumed',
    neverRan: 'Has not run yet',
    head: (v) => `Mailboxes ${v.account ?? 'unknown'} · model ${v.model ?? 'none (rules)'} · ${v.paused ? 'paused' : 'running'} · ${v.seen} mails handled`,
    run: (r) => `${r.at} (${r.reason}): ${r.scanned} new, ${r.processed} analysed, ${r.noise} noise, ${r.duplicates} duplicates, ${r.created.length} created`,
    filled: (t) => `~ time filled in: ${t}`,
    calendar: (n) => `📅 ${n} mirrored to calendar`,
    calendarMissing: 'Some items belong on a calendar, but dsh-calendar is not installed or connected; they went to the to-do list only',
    decision: { noise: 'noise, skipped', none: 'no action needed', cc: 'CC only, skipped', dup: 'already listed', todo: '→ to-do', 'todo+cal': '→ to-do + calendar' },
    cmd: 'Check new mail now and add anything that needs action to the to-do list',
  },
}

export function t(lang) {
  return M[lang] ?? M.en
}
