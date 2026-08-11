# @daanvandenbergh/policykit

![Versioned legal policies as MDX](.agentstore/scribekit-hero/readme/hero.png)

Versioned legal policies as MDX for **Next.js App Router**. A legal policy (terms of service,
privacy policy, DPA, ...) is a *versioned document*, not UI: it has revisions, each revision has
an effective date and a notice obligation, the published text is legal evidence, and your app
needs to answer "which revision binds right now?", "what notice is owed?", and "render revision X
in locale Y" - including OLD revisions, which ARE the version archive. policykit stores each
policy as a directory where **a version IS a directory** (`<date>/<locale>.mdx`), and the
`Policy` class answers those three questions. Everything else - notice delivery, consent storage,
your notice-window arithmetic - deliberately stays yours.

**📖 Full documentation: [daanvandenbergh.github.io/policykit](https://daanvandenbergh.github.io/policykit)**

**Contents:** [Install](#install) · [The content directory](#the-content-directory) ·
[Quickstart](#quickstart) · [The archive route](#the-archive-route) ·
[The takes-effect banner](#the-takes-effect-banner) ·
[The consent gate](#the-consent-gate) · [The notice job](#the-notice-job) ·
[Lifecycle rules](#lifecycle-rules) · [Claude Code skill and rules](#claude-code-skill-and-rules) ·
[API](#api) · [What this package does not do](#what-this-package-does-not-do)

---

## Install

```bash
npm install @daanvandenbergh/policykit
```

Peer dependencies (you almost certainly already have the first three): `next`, `react`,
`react-dom`, and `next-mdx-remote` (used by the `/react` entry to render MDX).

The root entry (`@daanvandenbergh/policykit`) is **react-free** - its module graph imports only
`node:fs`, `node:path`, and `gray-matter` - so server-side packages that forbid react can import
it safely. Only the `/react` subpath touches react.

---

## The content directory

One directory per policy; one directory per **revision** (its `YYYY-MM-DD` name IS the revision's
identity); one MDX file per locale:

```
policies/terms-of-service/
  2026-07-07/            # a revision - the date it was decided
    en.mdx               # frontmatter lives here (the default locale)
    nl.mdx
  2026-07-28/            # a later revision
    en.mdx
    nl.mdx
  drafts/                # IGNORED by the loader - the one parking spot for work in progress
```

The grammar is STRICT and every breach is a loud error naming the offending entry (thrown at
first use - which fails `next build` - never at import time):

- a revision directory must be a real `YYYY-MM-DD` calendar day (a typo'd `2026-8-15/` or an
  impossible `2026-02-30/` is an error, never an invisible revision);
- inside a revision directory, every file is `<locale>.mdx` for a locale you configured;
- every file must have a non-empty MDX body - frontmatter alone is not a legal document;
- nothing else may sit at the policy root, except `drafts/`, which is skipped wholesale - a
  committed dated directory is *published* (it ships on the next deploy and becomes `latest`).

The revision date is written once, the filesystem enforces revision uniqueness, and `ls` shows
the whole archive. There is deliberately no free-form revision naming and no date-in-frontmatter:
legal versions are cited by date ("the terms of 28 July 2026"), which is exactly the directory
name, and your consent records store that same string.

### Frontmatter

The **default locale's file** (`en` unless configured) carries the revision's metadata:

```yaml
---
effectiveFrom: 2026-08-12    # REQUIRED. A real YYYY-MM-DD calendar day >= the revision date.
                             # The gap IS the notice window: publish today, take effect after
                             # the notice period. Impossible dates are errors - including
                             # unquoted YAML dates that would otherwise roll over silently.
notice: notify               # REQUIRED. none | notify | reconsent - the recorded legal judgement.
changeSummary: "Added the monthly fair-use limit and retiered change notice."
                             # REQUIRED, non-empty, English. INTERNAL changelog/evidence -
                             # never rendered to users.
title: "Terms of Service"    # OPTIONAL display title.
---
```

Non-default locale files may carry ONLY an optional `title:`. Any other key in any file is a
validation error - metadata duplicated across locales is metadata that drifts.

Locales follow a **contiguity** rule, not completeness: the default locale must exist for every
revision; any other locale, once introduced at revision R, must exist for every revision after R.
It may be absent before R - a locale added in 2027 never demands fake backdated translations of
the 2026 archive.

---

## Quickstart

**1. Configure one instance per policy, in one module** (absolute `dir` - the same instance may
run from several working directories):

```ts
// e.g. src/content/policies.ts
import path from "node:path";
import { Policy } from "@daanvandenbergh/policykit";

const dir = (slug: string) => path.join(process.cwd(), "policies", slug);

export const termsPolicy = new Policy({
    slug: "terms-of-service",
    dir: dir("terms-of-service"),
    locales: ["en", "nl"],
});
export const privacyPolicy = new Policy({
    slug: "privacy",
    dir: dir("privacy"),
    locales: ["en", "nl"],
});
export const POLICIES = [termsPolicy, privacyPolicy];
```

**2. Render the live page.** `PolicyDocument` is an async server component that renders ONE
revision's MDX body (with GFM, so pipe tables work) - you own the page shell: title, "last
updated" label, prose styling, and the link component via the MDX component map (policykit never
imports `next/link`):

```tsx
// app/[locale]/legal/terms/page.tsx
import { PolicyDocument } from "@daanvandenbergh/policykit/react";
import { termsPolicy } from "@/content/policies";
import { MyLink } from "@/components/MyLink"; // your locale-aware link component

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const now = new Date();
    const shown = termsPolicy.effective(now) ?? termsPolicy.latest();
    const pending = termsPolicy.pending(now);
    // The locale file's own title; shown.title is the DEFAULT locale's and would be the wrong
    // language here (content() deliberately does no fallback - the fallback is your call).
    const title = termsPolicy.content(shown.revision, locale)?.title ?? shown.title;
    return (
        <article className="prose">
            <h1>{title}</h1>
            {pending && <p>A new version takes effect on {pending.effectiveFrom}.</p>}
            <PolicyDocument
                policy={termsPolicy}
                locale={locale}
                revision={shown.revision}
                components={{ a: MyLink }}
            />
        </article>
    );
}
```

`effective(now) ?? latest()` is the live-page revision: the text that binds, or the newest
published text before anything is effective. Passing `revision={shown.revision}` keeps your title
and the body on the SAME revision; with `revision` omitted, `PolicyDocument` computes that same
default itself - fine when you render no revision metadata around it.

**3. Validate in CI.** One test proves a deploy cannot fail on policy content:

```ts
import { it } from "vitest";
import { assertValidAll } from "@daanvandenbergh/policykit";
import { POLICIES } from "@/content/policies";

it("policies are valid", () => assertValidAll(POLICIES));
```

---

## The archive route

Old revisions ARE the version archive - serve them from a dynamic segment and 404 on anything
unknown (`revision()` takes untrusted input and returns `undefined`, never throws):

```tsx
// app/[locale]/legal/terms/[revision]/page.tsx
import { notFound } from "next/navigation";
import { PolicyDocument } from "@daanvandenbergh/policykit/react";
import { termsPolicy } from "@/content/policies";

export default async function TermsRevisionPage({ params }: {
    params: Promise<{ locale: string; revision: string }>;
}) {
    const { locale, revision } = await params;
    if (!termsPolicy.revision(revision)) notFound();
    if (!termsPolicy.content(revision, locale)) notFound(); // locale may legally be absent here
    return <PolicyDocument policy={termsPolicy} locale={locale} revision={revision} />;
}
```

---

## The takes-effect banner

Site-wide, "a new version of our terms takes effect on {date}". `PolicyBanner` is a **headless**
server component: it resolves which revision to announce and hands it to your `children` - the
copy, the date formatting, and the markup are yours (no CSS ships, and the sentence is localized
text only you can write). It renders `null` when there is nothing to announce:

```tsx
// app/[locale]/layout.tsx
import { PolicyBanner } from "@daanvandenbergh/policykit/react";
import { POLICIES } from "@/content/policies";

<PolicyBanner policies={POLICIES}>
    {({ policy, revision }) => (
        <aside className="banner">
            {t(`legal.${policy.slug}.takesEffect`, { date: format(revision.effectiveFrom) })}{" "}
            <MyLink href={`/legal/${policy.slug}`}>Read it</MyLink>
        </aside>
    )}
</PolicyBanner>
```

It announces the revision taking effect **soonest** across the policies you pass, and only one
that **owes notice** - a `notice: "none"` revision is never announced (the tier IS the recorded
decision that no notice is owed), and it never masks a later notice-owing revision behind it.
Superseded revisions are excluded, same as everywhere. Pass `now` to pin the clock in tests.

Need the same answer outside React (an in-app banner API, a mail digest header)? The core
exports it directly - the component is a thin wrapper around this:

```ts
import { pendingNotice } from "@daanvandenbergh/policykit";

const announcement = pendingNotice(POLICIES, new Date()); // { policy, revision } | undefined
```

**`pending()` vs `pendingNotice`.** On a policy's OWN page, `policy.pending(now)` is the right
call - it labels that document's next version whatever its tier (the quickstart does this).
`pendingNotice` is the *notice* question, so it applies the tier filter; do not hand-roll it as
`policies.map((p) => p.pending(now)).filter((r) => r?.notice !== "none")` - that drops a policy
whose soonest pending revision happens to be `none` and silently swallows the `reconsent` behind
it.

---

## The consent gate

Store the accepted revision as the **string** the package gives you (e.g. `"2026-07-28"`) and
compare with lexicographic `>=` - the strings are zero-padded ISO, so string order is date order:

```ts
import { requiredConsentRevision } from "@daanvandenbergh/policykit";

const required = requiredConsentRevision(POLICIES, new Date());
// "" means nothing is in force yet, so nobody owes consent; ?? "" keeps a never-accepted
// user (undefined stamp) from failing the comparison for the wrong reason.
const consented = required === "" || (user.acceptedPolicyRevision ?? "") >= required;
```

`requiredConsentRevision` is the max *effective* revision that is either a policy's baseline
(the first revision that ever binds) or carries `notice: "reconsent"`. A `"notify"` revision
deliberately never moves it - it must never re-prompt anyone. A revision superseded before its
effective day never moves it either - its text never binds (see [the notice job](#the-notice-job)),
so demanding consent to it would re-prompt everyone over nothing; if the superseding revision
still owes that reconsent, record `reconsent` on the superseding revision itself.

**Stamp the joint threshold the user just satisfied - `requiredConsentRevision` itself, evaluated
at acceptance time:**

```ts
// What an acceptance stamps. The value is monotone over time and NEVER runs ahead of a
// requirement that has not bound yet - which is exactly what a hand-rolled stamp gets
// wrong. Stamping one policy's revision lags the joint gate (re-prompting forever), and
// stamping the max EFFECTIVE revision across policies can run AHEAD of a sibling policy's
// pending reconsent (a newer-dated notify revision inflates the stamp past the reconsent's
// revision string, silently masking it when it binds - consent recorded that was never
// given). The threshold itself has neither failure mode.
const accepted = requiredConsentRevision(POLICIES, new Date());
```

The user still SEES the effective texts (the quickstart page renders `effective(now)`); the stamp
is the gate value those texts satisfy, not a display artifact. One cross-policy nuance to know:
the gate is a single joint threshold, so a reconsent revision whose date string is older than a
sibling policy's newer baseline/reconsent revision is subsumed by it - users are re-prompted once
against the joint threshold, not once per policy. If you need strictly per-policy reconsent
tracking, run the gate per policy (`requiredConsentRevision([termsPolicy], now)` etc.) with one
stored stamp per policy.

All binding comparisons reduce `now` to its **UTC calendar day** - a revision takes effect at UTC
midnight of its `effectiveFrom`, everywhere.

---

## The notice job

`noticeQueue` lists every revision across your policies that owes user-facing notice
(`notice !== "none"`) whose `effectiveFrom` is recent (within `horizonDays`, default 60) or still
in the future. Your job delivers the notices and dedupes per `(user, policy, revision.revision)`:

```ts
import { noticeQueue } from "@daanvandenbergh/policykit";

for (const { policy, revision } of noticeQueue(POLICIES, { now: new Date() })) {
    await notifyUsersOnce(policy.slug, revision.revision, revision.effectiveFrom);
}
```

**The horizon is load-bearing, not an optimization.** If your notice dedupe rows expire on a TTL,
keep the horizon comfortably INSIDE that TTL (the 60-day default suits a 90-day TTL): an
unbounded queue would re-notify every user about every historical revision each time its dedupe
row expired.

A revision superseded before it ever bound - a newer revision (say, an immediate law/security
change) took effect on or before its `effectiveFrom` - is never queued, and `pending()` never
returns it: its text will never bind, and announcing it would be misinformation.

---

## Lifecycle rules

The package validates the layout and frontmatter; these judgement calls it deliberately leaves to
you (shipped as `rules/policies.md`, see below):

- **Errata vs revision.** An immaterial fix (typo, link, formatting) edits the published file in
  place - git is the errata trail. A change that moves the MEANING of a clause is a new revision;
  a fake revision per typo would flip consent gates and re-prompt every user over a comma.
- **One revision per day**, and never amend a shipped revision - notice dedupe is keyed on the
  revision string and will not re-send.
- **A committed dated directory IS published.** Drafts live in `drafts/` or on a branch.
- **Notice windows are your contract, not the package's.** policykit validates only
  `effectiveFrom >= revision`; the window your own terms promise (and its legal exceptions - a
  change forced by law or security may be adverse AND immediate) is arithmetic you own. Pin your
  promise with your own test.
- **Fresh translations per revision** - a copied-forward old translation validates green and lies.
- **Never rewrite git history over policy content** - the log is part of the acceptance-evidence
  chain.

---

## Claude Code skill and rules

The package ships both halves of the agent contract:

```bash
# The authoring workflow skill (add/update a revision, end to end):
mkdir -p .claude/skills
ln -s ../../node_modules/@daanvandenbergh/policykit/skills/policykit .claude/skills/policykit
```

And add this line to your `CLAUDE.md` so the editing rules load into every session:

```
@node_modules/@daanvandenbergh/policykit/rules/policies.md
```

---

## API

Root entry - react-free:

- `new Policy({ slug, dir, locales, defaultLocale? })` - construction stores config; all IO is
  lazy, per-file memoized, and re-validated on every accessor (so `next dev` sees edits live and
  a broken directory fails every call, loudly).
- `policy.revisions()` - all revisions, ascending. Throws `PolicyValidationError` on any breach.
- `policy.latest()` - the newest revision by date (the live page's fallback before anything is
  effective; during a notice window it is published but not yet binding, so never what an
  acceptance stamps).
- `policy.effective(now)` - the revision that BINDS at `now`, or `undefined` before the first
  `effectiveFrom`. What the live page renders, as `effective(now) ?? latest()`. NOT the consent
  gate - that is `requiredConsentRevision`, and stamping this instead has a named failure mode
  (see [the consent job](#the-consent-job)).
- `policy.pending(now)` - published, not yet effective, and still going to bind (superseded
  revisions are never announced). The right call to label ONE document's next version on its own
  page; a site-wide "takes effect on" banner uses `pendingNotice`, which also filters by tier.
- `policy.revision(date)` - lookup by exact revision string; `undefined` on a miss, never throws
  on the lookup itself (an invalid corpus still throws `PolicyValidationError`).
- `policy.content(revision, locale)` - `{ source, title? }` or `undefined` (absence is an
  answer: a locale may legally be missing from an old revision). `title` is THAT locale's own;
  `revision.title` is the default locale's - see the note in the quickstart.
- `policy.has(revision, locale)` - the cheap existence check, no body read. What an archive route
  asks before choosing between rendering and a 404, instead of calling `content()` twice.
- `policy.owedNotices({ now, horizonDays? })` - the owed-notice revisions of THIS policy
  (`readonly PolicyRevision[]`). Same semantics as `noticeQueue`, for per-document surfaces that
  should not have to build a one-element array and unwrap `{ policy }` pairs.
- `policy.assertValid()` / `assertValidAll(policies)` - walk everything, throw the first
  violation naming the file and field; `assertValidAll` also rejects duplicate slugs.
- `pendingNotice(policies, now)` - the one pending revision a banner should announce:
  soonest-effective across the policies, still going to bind, and owing notice
  (`notice !== "none"`); `{ policy, revision }` or `undefined`.
- `noticeQueue(policies, { now, horizonDays? })` - the owed-notice queue (see above).
- `DEFAULT_NOTICE_HORIZON_DAYS` (`60`) - the default horizon, exported so a consumer can ASSERT it
  against its own dedupe TTL. **A horizon longer than that TTL re-queues every historical revision
  each time a dedupe row is swept**, re-notifying everyone on a schedule nobody watches. Compare
  the two in a test.
- `requiredConsentRevision(policies, now)` - the consent gate threshold (see above).
- `PolicyValidationError` - carries `{ slug, file?, field? }` for precise rendering/logging.

React entry (`@daanvandenbergh/policykit/react`):

- `<PolicyDocument policy locale revision? components? />` - async server component rendering
  one revision's MDX body via `next-mdx-remote` with `remark-gfm`. The compile is memoized per (options, source), so a revision is compiled once per process and an edit is a different key - never a stale document. No CSS ships.
- `<PolicyBanner policies now?>{({ policy, revision }) => ...}</PolicyBanner>` - headless server
  component announcing the next revision to take effect (`pendingNotice`), or `null`. Reads the
  filesystem, so it is server-only - never inside a `"use client"` tree.

---

## What this package does not do

policykit answers "what binds, what is owed, render it" - and stops. Notice DELIVERY (email,
in-app), consent STORAGE, notice-window arithmetic, diff/redline rendering, content hashes (git
is the integrity record), and draft/preview modes are deliberately out of scope.
