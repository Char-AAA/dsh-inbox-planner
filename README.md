# dsh-inbox-planner

English | [中文](README.zh.md)

**Inbox → to-dos → calendar for DeepSeek Harness (DSH).** New mail that needs you to do something (reply, confirm, pay, submit, attend) becomes a dated to-do in the built-in to-do panel, which has a list and a month calendar. When a later mail moves or cancels it, the to-do follows. You get a reminder before it starts and a daily brief in the morning. Items can optionally go to [dsh-calendar](https://www.npmjs.com/package/dsh-calendar) as well. No chat turn is used, and no second copy of your mail password is stored.

```
dsh-email ──email_list / email_read / email_attachment──▶ inbox-planner ──▶ built-in to-do panel (list + calendar + reminders)
(mail, credentials)                                      │       └──────▶ dsh-calendar (optional)
  sender rules → noise filter → invitation (.ics) / reused result / parallel model extraction (rules fallback) → reschedule·cancel follow-up → dedupe → clash check
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

From a plugin index ([dshopen.org](https://dshopen.org), awesome-dsh-plugin), use **Plugins → Discover**. Or ask the agent / run:

```
plugin_manager action: install_bundle target: dsh-inbox-planner
dsh plugin --profile desktop add dsh-inbox-planner
```

About 15 seconds after loading, the first run picks up the last `backfillDays` (default 3) of mail. After that the inbox is checked every `pollSeconds` (default 60).

## What a run does

1. **Lists envelopes newer than the watermark.** IMAP uses the uid watermark; POP3/AgentMail string ids use a seen-set plus a baseline time. If a backlog built up while DSH was closed, it pages back up to 200 mails. A run with no new mail costs one `email_list` and nothing else.
2. **Applies sender rules.** Senders in `ignoreSenders`, or ignored from the activity log, are skipped. Senders in `alwaysSenders` are never dropped as noise or CC-only.
3. **Drops noise without a model call:** verification codes, sign-in alerts, application receipts, newsletters, promotions, surveys. If the subject contains an action word (interview, deadline, payment due, rescheduled, cancelled, 笔试, 截止…), the mail is never dropped.
4. **Extracts items, cheapest source first:**
   - **Calendar invitations.** When the mail carries an `.ics` invitation, its time, length, place and organiser are read directly, with no model call. Time zones are handled, including Outlook's Windows zone names, as are all-day events. An updated invitation (higher SEQUENCE) counts as a reschedule; `METHOD:CANCEL` counts as a cancellation. The temporary download is deleted after reading.
   - **Reused results.** The same notice delivered to two mailboxes, or sent twice, costs one model call.
   - **Your model**, one call per mail, with up to `concurrency` (default 3) mails analysed at once. To-dos are still written strictly in mail order. One mail can produce several items, for example "confirm by the 13th 18:00" plus "exam on the 14th 09:00". Times are converted to your time zone and past events are ignored. Titles read as `Organisation: action`. The model also returns preparation, location and duration. A malformed reply is retried once; a truncated one is retried with a doubled budget; in `auto` mode a persistent failure falls back to rules.
5. **Respects CC.** Mail where you are only on CC creates nothing unless it names you for an action. Your own address is detected from dsh-email.
6. **Follows reschedules and cancellations (`followUps`).** "The interview has moved to Friday 14:00" changes the existing to-do's date and time, notes `🔁 Rescheduled: old → new`, and moves its calendar event. "Cancelled" marks the existing to-do `❌ Cancelled`, ticks it off and deletes its calendar event. A reschedule with no earlier item becomes a new item; a cancellation with no earlier item does nothing.
7. **Dedupes against everything already in the list,** including items you added by hand and items already done. An item counts as a duplicate when the organisation matches (after normalisation, so *Acme Inc* = *Acme* and *远景科技集团* = *远景*), the action kind matches (exam / assessment / interview / confirm / sign / docs / pay / meeting…), and the dates are within `dedupeDays`. If a newer mail supplies a missing time, the existing item is updated instead of a new one being created.
8. **Flags clashes.** When two items fall on the same day less than `conflictMinutes` apart, both get a ⚠️ note naming the other.
9. **Writes the item:** category `Mail`, with sender and subject, preparation, location, the supporting quote, attachment names, and `#inbox-planner uid=…` in the note.
10. **Mirrors to the calendar (optional).** Timed items become events with the right UTC offset; date-only items become all-day events. Each item is mirrored once.

State is saved after every mail in `$DSH_PROFILE_DIR/data/dsh-inbox-planner/state.json`, so a crash never reprocesses or skips mail.

## Reminders

- **Before it starts.** Timed to-dos remind you `remindMinutes` (default 30) beforehand. A rescheduled item reminds you again at its new time.
- **Daily brief.** At `briefTime` (default 08:30) you are reminded of today's and overdue to-dos; nothing happens when there are none.
- **Quiet hours.** No reminders during `quietHours` (default 22:00-08:00); those still relevant arrive when the window ends.
- **How (`remindStyle`).** By default a reminder only lights a red dot on the To-do icon in the sidebar, with no pop-up. Opening the To-do page clears it, and it stays off while the page is open. With `popup`, a banner appears in the window corner together with a system notification (permission is asked once).
- Reminders need a DSH window to be open. Windows share one record of what was shown, so each reminder fires once. Recurring to-dos have no separate reminder yet; they count in the daily brief.

## Use

- Nothing to do: items appear in the to-do panel (filter by the `Mail` category).
- **Three icons next to the To-do panel title:**
  - **Refresh** checks mail now and reloads the list. `/inbox-sync` does the same from the chat box without involving the model.
  - **Activity** lists what happened to each recent mail and why (to-do added, rescheduled, cancelled, noise, CC only, ignored…), with totals: mails processed, model calls and their average time, reused results, invitations read. A skipped mail has **"Make a to-do anyway"**, which re-reads it and creates a to-do. Any mail has **"Ignore this sender"**; ignored senders can be restored from the same panel.
  - **Export .ics** saves your open dated to-dos as a calendar file to import into a phone or desktop calendar.
- Ask the agent "inbox planner status", "rescan mail 5402", "what mail did you process?", "ignore mail from shop.com" or "pause inbox planner". These map to the `inbox_planner` tool: `status / sync / rescan / activity / ignore_sender / unignore_sender / pause / resume`.

## Settings

Go to **Plugins → dsh-inbox-planner → Components → dsh-inbox-planner ›**. Fields are grouped into Basics, Rules, Calendar, Reminders and Model. **Save** applies the changes immediately, and each changed field has its own **Reset**. After installing or upgrading, restart DSH once so the page's browser half loads.

| Key | Default | |
|---|---|---|
| `accounts` | all | dsh-email account names, comma separated |
| `pollSeconds` | 60 | 0 turns off automatic checks |
| `backfillDays` | 3 | first-run window |
| `category` | `Mail` / `邮件` | to-do category |
| `language` | auto | reports and notes; follows the DSH UI language |
| `titleLanguage` | system | `system` = titles in the language above · `mail` = keep each mail's language |
| `engine` | auto | `auto` · `llm` (strict, never advances past a failure) · `rules` (zero model calls) |
| `llmProvider` / `llmModel` | DSH default | |
| `concurrency` | 3 | mails analysed at once (1–6) |
| `maxItemsPerMail` | 3 | |
| `skipCcOnly` | true | |
| `selfAddresses` | auto | comma separated |
| `followUps` | true | apply reschedules and cancellations to existing to-dos |
| `invites` | true | read attached `.ics` invitations without a model call |
| `ignoreSenders` / `alwaysSenders` | | addresses or domain fragments, comma separated |
| `conflictMinutes` | 150 | 0 = off |
| `annotateBoth` | true | annotate the older item too |
| `dedupeDays` | 3 | |
| `calendar` | events | `events` · `all` · `off`; needs dsh-calendar. Without it, dated items still appear in the to-do panel's own month calendar |
| `eventMinutes` | 60 | used when the mail gives no duration |
| `remindMinutes` | 30 | 0 = no reminders |
| `briefTime` | 08:30 | empty = no daily brief |
| `quietHours` | 22:00-08:00 | empty = none |
| `remindStyle` | dot | `dot` = red dot on the To-do icon · `popup` = banner + system notification |
| `promptExtra` | | extra instructions for the model |
| `extraNoise` | | regex on subject or sender |
| `llmBodyChars` / `llmMaxTokens` / `llmTimeoutMs` | 2500 / 3000 / 180000 | |

## Privacy

Mail bodies, cleaned of quoted replies, signatures and links and capped at `llmBodyChars`, are sent to the model you configured in DSH, and to no one else. Calendar invitations are parsed on this machine and are not sent to the model. This plugin stores no credentials and makes no network calls of its own. The activity log keeps subjects, senders and outcomes, not bodies.

## Development

```
npm install
npm test
```

The tests use the real dsh-sidebar-todo store. `test/host-contract.test.js` loads the plugin through `apply()` and sends every tool call through an executor that follows DSH's documented `ToolBatchInput` / `ToolBatchResult` contract. Mail and the model are fakes.

Issues and PRs welcome. MIT.

## Third-party notice

The built-in To-do panel is adapted from dsh-sidebar-todo, which is MIT licensed. Its license text is kept in `vendor/LICENSE.dsh-sidebar-todo`, as the MIT license requires.
