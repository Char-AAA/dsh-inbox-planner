# dsh-inbox-planner

English | [中文](README.zh.md)

**Inbox → to-dos → calendar for DeepSeek Harness (DSH).** New mail that needs you to do something — reply, confirm, pay, submit, attend — becomes a dated to-do in the [dsh-sidebar-todo](https://www.npmjs.com/package/dsh-sidebar-todo) panel (list + month calendar), and optionally an event in [dsh-calendar](https://www.npmjs.com/package/dsh-calendar). No chat turn, no extra UI, no second copy of your mail password.

```
dsh-email ──email_list / email_read──▶ inbox-planner ──personal_todo──▶ dsh-sidebar-todo (list + calendar)
(mail, credentials)                    │                └─calendar_create─▶ dsh-calendar (optional)
                         noise filter → model extraction (rules fallback) → dedupe → clash check
```

## Mailboxes

Every account configured in dsh-email is processed: QQ, 163, 126, Gmail, Outlook and Microsoft 365, Tencent Exmail, any IMAP or POP3 server, and AgentMail. Each mailbox keeps its own progress. One shared to-do list dedupes across all of them. To limit processing to some mailboxes, list their account names in the `accounts` setting. An OAuth account (Gmail or Outlook) is skipped until it is signed in under Settings → Email.

## Requirements

| Plugin | Why |
|---|---|
| [dsh-email](https://www.npmjs.com/package/dsh-email), with an account that receives mail | source of mail; credentials stay there |
| *(built in)* To-do + calendar panel | adapted from dsh-sidebar-todo (MIT). If you used dsh-sidebar-todo before, **disable it**: your existing to-dos carry over, because the same data file is used |
| [dsh-calendar](https://www.npmjs.com/package/dsh-calendar) *(optional)* | real calendar events (iCloud / CalDAV / Google) |

DSH `>=0.2.1-rc.2 <0.3`. Uses your DSH default model unless you pick another.

## Install

From a plugin index, use **Plugins → Discover**. Or ask the agent / run:

```
plugin_manager action: install_bundle target: dsh-inbox-planner
dsh plugin --profile desktop add dsh-inbox-planner
```

About 15 seconds after loading, the first run picks up the last `backfillDays` (default 3) of mail. After that the inbox is checked every `pollSeconds` (default 60).

## What a run does

1. **Lists envelopes newer than the watermark.** IMAP uses the uid watermark; POP3/AgentMail string ids use a seen-set plus a baseline time. If a backlog built up while DSH was closed, it pages back up to 200 mails. A run with no new mail costs one `email_list` and nothing else.
2. **Drops noise without a model call:** verification codes, sign-in alerts, application receipts, newsletters, promotions, surveys. If the subject contains an action word (interview, deadline, payment due, 笔试, 截止…), the mail is never dropped.
3. **Extracts with your model, one call per mail.** One mail can produce several items, for example "confirm by the 13th 18:00" plus "exam on the 14th 09:00". Times are converted to your time zone and past events are ignored. Titles follow the mail's own language and read as `Organisation: action`. The model also returns preparation, location and duration. A malformed reply is retried once; a truncated one is retried with a doubled budget; in `auto` mode a persistent failure falls back to rules.
4. **Respects CC.** Mail where you are only on CC creates nothing unless it names you for an action. Your own address is detected from dsh-email.
5. **Dedupes against everything already in the list,** including items you added by hand and items already done. An item counts as a duplicate when the organisation matches (after normalisation, so *Acme Inc* = *Acme* and *远景科技集团* = *远景*), the action kind matches (exam / assessment / interview / confirm / sign / docs / pay / meeting…), and the dates are within `dedupeDays`. If a newer mail supplies a missing time, the existing item is updated instead of a new one being created.
6. **Flags clashes.** When two items fall on the same day less than `conflictMinutes` apart, both get a ⚠️ note naming the other.
7. **Writes the item:** category `Mail`, with sender and subject, preparation, location, the supporting quote, and `#inbox-planner uid=…` in the note.
8. **Mirrors to the calendar (optional).** Timed items become events with the right UTC offset; date-only items become all-day events. Each item is mirrored once.

State is saved after every mail in `$DSH_PROFILE_DIR/data/dsh-inbox-planner/state.json`, so a crash never reprocesses or skips mail.

## Use

- Nothing to do: items appear in the to-do panel (filter by the `Mail` category).
- The **refresh icon** next to the To-do panel title checks mail now and reloads the list. The same action is also under **Sidebar → More → "Sync mail → to-do now"**. `/inbox-sync` does the same from the chat box, without involving the model.
- Ask the agent "inbox planner status", "rescan mail 5402" or "pause inbox planner". These map to the `inbox_planner` tool: `status / sync / rescan / pause / resume`.

## Settings

Go to **Plugins → dsh-inbox-planner → Components → dsh-inbox-planner ›**. Fields are grouped into Basics, Rules, Calendar and Model. **Save** applies the changes immediately, and each changed field has its own **Reset**. After installing or upgrading, restart DSH once so the page's browser half loads.

| Key | Default | |
|---|---|---|
| `pollSeconds` | 60 | 0 turns off automatic checks |
| `backfillDays` | 3 | first-run window |
| `category` | `Mail` / `邮件` | to-do category |
| `language` | auto | reports and notes; titles follow the mail |
| `engine` | auto | `auto` · `llm` (strict, never advances past a failure) · `rules` (zero model calls) |
| `llmProvider` / `llmModel` | DSH default | |
| `maxItemsPerMail` | 3 | |
| `skipCcOnly` | true | |
| `selfAddresses` | auto | comma separated |
| `conflictMinutes` | 150 | 0 = off |
| `annotateBoth` | true | annotate the older item too |
| `dedupeDays` | 3 | |
| `calendar` | events | `events` · `all` · `off`; needs dsh-calendar. Without it, dated items still appear in the to-do panel's own month calendar |
| `eventMinutes` | 60 | used when the mail gives no duration |
| `promptExtra` | | extra instructions for the model |
| `extraNoise` | | regex on subject or sender |
| `llmBodyChars` / `llmMaxTokens` / `llmTimeoutMs` | 2500 / 3000 / 180000 | |

## Privacy

Mail bodies, cleaned of quoted replies, signatures and links and capped at `llmBodyChars`, are sent to the model you configured in DSH, and to no one else. This plugin stores no credentials and makes no network calls of its own.

## Development

```
npm install
npm test
```

The tests use the real dsh-sidebar-todo store. `test/host-contract.test.js` loads the plugin through `apply()` and sends every tool call through an executor that follows DSH's documented `ToolBatchInput` / `ToolBatchResult` contract. Mail and the model are fakes.

Issues and PRs welcome. MIT.

## Third-party notice

The built-in To-do panel is adapted from dsh-sidebar-todo, which is MIT licensed. Its license text is kept in `vendor/LICENSE.dsh-sidebar-todo`, as the MIT license requires.
