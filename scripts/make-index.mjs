#!/usr/bin/env node
/**
 * Build a one-plugin DSH index (format 1) from the published npm versions.
 * Usage: node scripts/make-index.mjs > market/index.json
 * Host market/ on GitHub Pages; users add https://<you>.github.io/dsh-inbox-planner/index.json
 * in Plugins → Discover → Add index source.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const view = JSON.parse(execFileSync('npm', ['view', pkg.name, '--json', 'time', 'versions', 'deprecated'], { encoding: 'utf8' }))
const icon = `data:image/svg+xml;base64,${readFileSync(new URL('../icon.svg', import.meta.url)).toString('base64')}`

const versions = (Array.isArray(view.versions) ? view.versions : [view.versions]).map((version) => {
  // npm view collapses to the bare value when only one field exists, so ask one field at a time.
  const field = (f) => { const out = execFileSync('npm', ['view', `${pkg.name}@${version}`, f, '--json'], { encoding: 'utf8' }).trim(); return out ? JSON.parse(out) : undefined }
  const meta = { dsh: field('dsh'), engines: field('engines') }
  if (!meta.dsh?.bundle) return null
  return {
    version,
    publishTimestamp: Math.floor(Date.parse(view.time[version]) / 1000),
    source: { type: 'npm' },
    ...(meta.engines?.dsh ? { engines: { dsh: meta.engines.dsh } } : {}),
  }
}).filter(Boolean)

const index = {
  format: 1,
  title: { en: 'Inbox Planner', zh: '收件箱规划' },
  description: { en: 'DSH plugins by ' + pkg.author, zh: pkg.author + ' 的 DSH 插件' },
  plugins: [{
    name: pkg.name,
    title: { en: 'Inbox Planner', zh: '收件箱规划' },
    description: {
      en: 'New mail that needs your action becomes dated to-dos (list + calendar), with dedupe, clash warnings and optional calendar sync.',
      zh: '新邮件里需要你处理的事，自动连同日期时间写进待办（列表 + 月历），带判重、冲突提示，可选同步到日历。',
    },
    icon,
    author: pkg.author,
    homepage: pkg.homepage,
    repository: { url: pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '') },
    versions,
  }],
}
process.stdout.write(JSON.stringify(index, null, 2) + '\n')
