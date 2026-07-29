# @daanvandenbergh/policykit

Versioned legal policies as MDX for **Next.js App Router**. A legal policy (terms of service,
privacy policy, DPA, ...) is a *versioned document*, not UI: it has revisions, each revision has
an effective date and a notice obligation, the published text is legal evidence, and your app
needs to answer "which revision binds right now?", "what notice is owed?", and "render revision X
in locale Y" - including OLD revisions, which ARE the version archive. policykit stores each
policy as a directory where **a version IS a directory** (`<date>/<locale>.mdx`), and the
`Policy` class answers those three questions. Everything else - notice delivery, consent storage,
your notice-window arithmetic - deliberately stays yours.

**Contents:** [Install](#install) · [The content directory](#the-content-directory) ·
[Quickstart](#quickstart) · [The archive route](#the-archive-route) ·
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

- a revision directory must match `YYYY-MM-DD` (a typo'd `2026-8-15/` is an error, never an
  invisible revision);
- inside a revision directory, every file is `<locale>.mdx` for a locale you configured;
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
effectiveFrom: 2026-08-12    # REQUIRED. YYYY-MM-DD, >= the revision date. The gap IS the
                             # notice window: publish today, take effect after the notice period.
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

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const now = new Date();
    const latest = termsPolicy.latest();
    const pending = termsPolicy.pending(now);
    return (
        <article className="prose">
            <h1>{latest.title}</h1>
            {pending && <p>A new version takes effect on {pending.effectiveFrom}.</p>}
            <PolicyDocument policy={termsPolicy} locale={locale} components={{ a: MyLink }} />
        </article>
    );
}
```

With `revision` omitted, `PolicyDocument` renders `effective(now) ?? latest()` - the text that
binds, or the first published text before anything is effective.

**3. Validate in CI.** One test proves a deploy cannot fail on policy content:

```ts
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

## The consent gate

Store the accepted revision as the **string** the package gives you (e.g. `"2026-07-28"`) and
compare with lexicographic `>=` - the strings are zero-padded ISO, so string order is date order:

```ts
import { requiredConsentRevision } from "@daanvandenbergh/policykit";

const required = requiredConsentRevision(POLICIES, new Date());
const consented = user.acceptedPolicyRevision >= required;
```

`requiredConsentRevision` is the max *effective* revision that is either a policy's FIRST
revision or carries `notice: "reconsent"`. A `"notify"` revision deliberately never moves it - it
must never re-prompt anyone.

**Stamp the EFFECTIVE revision the user was shown, never `latest()`**: during a notice window the
user accepts the text that binds, not the pending one.

```ts
const accepted = termsPolicy.effective(new Date())?.revision; // what an acceptance stamps
```

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
- `policy.latest()` - the newest revision (the live page + signup text).
- `policy.effective(now)` - the revision that BINDS at `now`, or `undefined` before the first
  `effectiveFrom`. What consent gates compare against and what acceptance stamps.
- `policy.pending(now)` - published but not yet effective; drives the "takes effect on" banner.
- `policy.revision(date)` - lookup by exact revision string; `undefined` on a miss, never throws.
- `policy.content(revision, locale)` - `{ source, title? }` or `undefined` (absence is an
  answer: a locale may legally be missing from an old revision).
- `policy.assertValid()` / `assertValidAll(policies)` - walk everything, throw the first
  violation naming the file and field; `assertValidAll` also rejects duplicate slugs.
- `noticeQueue(policies, { now, horizonDays? })` - the owed-notice queue (see above).
- `requiredConsentRevision(policies, now)` - the consent gate threshold (see above).
- `PolicyValidationError` - carries `{ slug, file?, field? }` for precise rendering/logging.

React entry (`@daanvandenbergh/policykit/react`):

- `<PolicyDocument policy locale revision? components? />` - async server component rendering
  one revision's MDX body via `next-mdx-remote/rsc` with `remark-gfm`. No CSS ships.

---

## What this package does not do

policykit answers "what binds, what is owed, render it" - and stops. Notice DELIVERY (email,
in-app), consent STORAGE, notice-window arithmetic, diff/redline rendering, content hashes (git
is the integrity record), and draft/preview modes are deliberately out of scope.
