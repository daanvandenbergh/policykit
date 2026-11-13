---
name: policykit
description: >-
    Author and audit versioned legal policies managed by @daanvandenbergh/policykit (terms, privacy
    policy, DPA, cookie policy). AUTHOR adds a revision: material change or erratum, the dated
    directory with every locale, notice tier, effectiveFrom, text drafted to the legal minimum,
    validation. AUDIT (`/policykit audit`) is the only legal review the policies get: every clause
    is checked TRUE (against the code and confirmed facts), LAWFUL (verified against the primary
    legal source) and MINIMUM (nothing promised beyond what the law requires); fresh subagents try
    to refute every finding; confirmed ones are fixed by default as a new revision (`--scan` reports
    only). Use when the user wants to add or update a policy revision, change the terms or privacy
    policy, fix a policy typo, asks about a notice tier or effective date, or wants to audit,
    validate, or fact-check a policy ("are we over-promising?", "is our policy legally ok?").
user-invokable: true
argument-hint: "audit [slug] [--scan] [--out <path>] [--refresh-law] | [policy slug or description of the change]"
---

# policykit - author and audit legal policies

This skill works on content consumed by `@daanvandenbergh/policykit`. A policy lives in a
directory the consumer configured (find its `new Policy({ slug, dir, locales, defaultLocale? })`
instances - conventionally one module such as `src/content/policies.ts`); inside it, **a version
IS a directory**:

```
<dir>/
  2026-07-07/         # one directory per revision - its YYYY-MM-DD name IS the revision identity
    en.mdx            # frontmatter lives here (the default locale; "en" unless configured)
    nl.mdx            # other locales: body + optional title ONLY
  drafts/             # ignored by the loader - the one parking spot for work in progress
```

The editing judgement calls (material vs erratum, one revision per day, fresh translations, never
rewriting history) live in `rules/policies.md` at the package root (two directories up from this
skill: `node_modules/@daanvandenbergh/policykit/rules/policies.md`). Read it first and treat it as
binding.

## Pick the mode

- **AUDIT** - the arguments start with `audit`, or the user asks to audit, review, check, validate,
  verify, or fact-check a policy, or to cut it back to the legal minimum. Read `audit.md` in full and
  run it. It fixes what it finds by default; `--scan` makes it report only.
- **AUTHOR** - anything else: a change to make, a revision to add, a typo to fix. Run the steps
  below.

Both modes obey the doctrine that follows.

## The doctrine: promise exactly what the law requires, nothing more

Every sentence in a policy is either a promise the business must keep, for as long as the text
stands, or a statement someone can rely on. A promise can only be withdrawn with a new revision, a
notice, and sometimes fresh consent. A statement that turns out untrue is a misrepresentation. So
the target for every clause is the floor the governing law sets, stated precisely and truthfully,
with nothing added.

> **1. Every sentence is checked as what it is.** Each clause is one or more of:
> - **COMMITMENT** - the business promises to do or not do something ("we delete within 30 days").
> - **DISCLOSURE** - information a law requires ("you may lodge a complaint with a supervisory
>   authority").
> - **FACT** - an assertion about what the business or system does ("we use Stripe for payments").
> - **LAW** - a statement of what the law says or what rights someone has.
> - **RESERVATION** - the business reserves a right or limits its liability ("we may suspend
>   accounts"). The reservation itself is never an over-promise; check it for lawfulness. Any limit
>   the business sets on its own reservation ("only after 30 days' notice", "for up to 90 days") is a
>   COMMITMENT, and a FACT where it describes practice, and is checked as one.
> - **OBLIGATION** - a duty, waiver, indemnity, time bar, deemed consent, or dispute term
>   (arbitration, class waiver, choice of law or forum) imposed on the user. Check it for
>   lawfulness.
> - **CORE** - the commercial deal itself: the product sold, its price, and its numeric plan limits.
>   Accurate, not floored. Anything else (a service level, a guarantee, support terms, "unlimited")
>   is CORE only when the user confirmed it is part of what is sold, recorded in `accepted.md`. Until
>   then it is a COMMITMENT.
> - **BOILERPLATE** - a heading that only names its section ("Cookies", "7. Liability"). A heading
>   that asserts or promises anything is classified by what it says and checked like any clause. A
>   definition of a legal term ("'sell' means ...") is LAW, and is checked as such.
>
> **2. The floor is what the law requires, quoted from the primary source.** That means the statute,
> the regulation, the official consolidated text. Never memory, a blog, a vendor template, or a
> competitor's policy. No citation means no finding, no trim, and no "required". Recall is a lead to
> look up, not a source.
>
> **3. A commitment above the floor is a defect, not generosity.** Do not volunteer:
> - deletion faster than required,
> - notice periods longer than required,
> - uptime or response-time guarantees,
> - refunds or warranties beyond the mandated ones,
> - rights the statute does not grant,
> - named security technologies or certifications,
> - a competitor's more generous clause copied across.
>
> Where the law lets the business choose within a range, take the bound that costs the business
> least, together with every condition the law attaches to it - a default period with a conditional
> extension is stated as the default plus its condition, never as the outer limit. The commercial deal
> itself (CORE) is not floored, but any extra not part of that deal is a commitment like any other.
> A promise the system does not meet today is a breach already happening.
>
> **4. A fact is true only when the evidence says so.** Evidence is the code, the config, and facts
> the user confirmed. Never the policy itself. A claim the evidence cannot settle is a question for
> the user, never a pass.
>
> **5. Never go below the floor, and never trim on a guess.** "Not required" has to be established
> against every applicable law, exactly as "required" is - and text an app store, API provider, or
> customer contract the business is bound by requires is kept as the user's decision, not trimmed.
> If you cannot establish it, ask. Deleting a mandatory disclosure is a worse failure than keeping
> an extra sentence. If which law governs is unclear, or which customer class (consumer terms and
> business terms differ), ask. Never default to the generous reading: over-promising is not the safe
> side, it is an obligation.
>
> **6. Say what was not checked.** A clause, a law, or a fact that was not verified is reported as
> unverified. It never passes silently as fine.
>
> **7. Vagueness does not lower a promise.** In consumer contracts an ambiguous term is read the way
> that favours the consumer (EU Unfair Terms Directive 93/13/EEC Art 5; UK Consumer Rights Act 2015
> s69; the general contra proferentem rule elsewhere). No unbounded absolutes ("never", "always",
> "immediately", "under no circumstances", "100% secure"). They promise more than any operation can
> guarantee, and they turn an ordinary incident into a breach. State the actual practice, bounded by
> what the law requires, in precise words.

`reference/law-floors.md` lists the regimes, what each requires, and where to verify it.
`reference/over-promise-patterns.md` catalogues the common over-promises with bounded rewrites.
`reference/fact-sources.md` shows how to check a factual claim against the code.

## AUTHOR mode

### Step 0 - Locate the policy and its config

Find the consumer's `Policy` instances. Note the target policy's `dir`, `locales`, and
`defaultLocale` (default `"en"`) - they decide which files the new revision needs. If the user
did not name a policy, ask which one (list the configured slugs).

### Step 1 - Material change or erratum?

**Material means the meaning moved**: a right, a price, a limit, an obligation, a data practice.
If you have to ask, it is material.

- **Erratum** (typo, broken link, formatting, translation wording that does not change meaning):
  edit the published file IN PLACE and stop after validation - git is the errata trail. Never
  cut a revision for an erratum: a fake revision would flip the consumer's consent gates and
  re-prompt every user over a comma.
- **Material**: continue - this is a new revision.

### Step 2 - Pick the revision date

The revision date is TODAY as the UTC day (`date -u +%F` - the clock policykit binds on; the day
the change is decided), zero-padded `YYYY-MM-DD` - it becomes the directory name and the
revision's whole identity. One revision per day: if today's
directory is committed, date the new revision tomorrow. If it exists uncommitted, fold the change
into it only when one `effectiveFrom` and tier serve both changes without shortening a notice window
or delaying an immediate change; otherwise keep the immediate changes in today's directory and put
everything that owes notice in tomorrow's (as `audit.md` Phase 8 does). Never amend a committed
revision.

### Step 3 - Create the revision directory and write the text

Create `<dir>/<date>/` with one `<locale>.mdx` per configured locale (grammar:
`^[a-z]{2}(?:-[A-Z]{2})?\.mdx$` - e.g. `en.mdx`, `nl.mdx`, `nl-NL.mdx`). Rules:

- **Every locale is translated FRESH from the new source text** - never copy an old translation
  forward.
- Every file needs a non-empty MDX body - a file that is frontmatter with no document text
  fails validation.
- A NEW locale starts at the revision that introduces it - never backfill older revision
  directories (the loader enforces contiguity: once introduced, a locale must exist for every
  later revision; it does not catch a backfilled earlier one, so never add one).
- Nothing else goes in the directory - no images, no notes, no `.txt`. Work in progress that
  must be committed goes in `<dir>/drafts/`, never as a dated directory: **a committed dated
  directory IS published** and becomes `latest` on the next deploy.

**The text follows the doctrine.** Each new or changed sentence must meet three conditions. Any
floor it states (a period, a right, a condition) is verified against the primary source, recorded in
`.agentstore/policykit/law.md` (`audit.md` Phase 2 describes the method and format). Any fact it
states is true of the system (`reference/fact-sources.md`). And it promises nothing the law does not
require.

**Removing an existing over-promise is a material change in its own right.** It reduces what the
customer gets, so it is `notify` (or `reconsent` if consent hangs on it) with the notice window the
current terms promise. Never make it as a quiet in-place edit.

**A less protective privacy change never reaches data already collected on notice alone.** When a
revision lets the business use, share, or keep personal data in a way the binding text did not
allow (a new purpose, new recipients, model training, longer retention, or a privacy promise removed
or weakened) and US users are in scope, follow `audit.md` Phase 8's "US privacy promises" rule:
either write the change so it applies only to data collected after `effectiveFrom`, and keep the
old promise on the commitment register as `legacy: data collected before <effectiveFrom>`, or ask
the user whether to obtain affirmative express consent for existing data. `notify` alone never makes
such a change retroactive. Test every change that reduces what customers get with `audit.md` R7, and
use `reconsent` or ask when it cannot otherwise bind existing customers. (In the EU and UK a new
purpose also needs its own legal basis and prior information, Arts 6(4) and 13(3).)

### Step 4 - Frontmatter (default-locale file ONLY)

```yaml
---
effectiveFrom: 2026-08-12    # REQUIRED - see Step 5
notice: notify               # REQUIRED - see the table below
changeSummary: "Added the monthly fair-use limit and retiered change notice."
                             # REQUIRED - one plain-English sentence: what changed and why the
                             # tier is right. Internal changelog/evidence, never user copy.
title: "Terms of Service"    # OPTIONAL display title
---
```

Non-default locale files may carry ONLY an optional `title:` (localized). Any other key in any
file fails validation - metadata duplicated across locales is metadata that drifts.

**`notice` is the recorded legal decision:**

| Tier | When | Consequence in the consumer |
|---|---|---|
| `none` | Non-material, or a change forced by law/security that owes no notice (never where P2B or the DSA requires notifying the change) | Nothing queued; no takes-effect banner; consent gate unmoved |
| `notify` | Materially reduces what a customer gets, but existing consent stands | Queued for notice and announced by the banner; NEVER re-prompts consent |
| `reconsent` | Users must expressly accept again | Queued and announced, AND moves `requiredConsentRevision` from its `effectiveFrom` day |

Unsure -> the stricter tier.

### Step 5 - Set `effectiveFrom`

A real `YYYY-MM-DD` calendar day, `>=` the revision date (the package validates both - an
impossible date is an error, including unquoted YAML dates that would otherwise roll over to a
different day). The gap between the two IS the notice window - and the window you must grant
comes from **the consumer's own published terms** (its change-notice clause), not from this
package, and from any statutory notice floor that applies (`reference/law-floors.md`, "Change
notice"). Read the consumer's current terms for the promised period (there may be tiers, e.g.
business vs consumer, and legal exceptions - a change forced by law or security may be
immediate). Shipping an adverse change effective tomorrow breaches the consumer's own contract
silently; when in doubt, ask the user what window applies.

One supersession consequence to check: ANY new revision whose `effectiveFrom` is on or before the
`effectiveFrom` of a pending revision - or of the binding revision, when that one took effect
today - SUPERSEDES it: the superseded text will never bind (again), and policykit
stops announcing it (`pending()`, `pendingNotice`, and `noticeQueue` exclude it) and never gates
consent on it (`requiredConsentRevision` skips it). Its changes are lost unless a revision carries
them, or dropping them is intended. Never carry them in a revision that takes effect BEFORE the
superseded one's `effectiveFrom` - that cuts short the notice users were already given. If the new
revision takes effect earlier, carry them in a second revision dated the next day, effective no
earlier than the superseded one's `effectiveFrom` (the latest one's, when several are superseded),
whose text is the new revision's plus the superseded changes. Whichever revision carries a
superseded revision's changes records that revision's tier when it is stricter - the superseded one no longer moves the consent gate or stays in
the notice queue.

The reverse case matters as much: a new revision that takes effect AFTER a pending one does not
supersede it. Write its text from the newest pending revision that takes effect before it, not the
binding one's, or the pending changes are reverted the day the new revision binds.

Across policies, check the order of `reconsent` revisions. The consent gate is one threshold:
`requiredConsentRevision` takes the max revision string over every policy the consumer passes to it
together (find that call - usually terms and privacy). Between those policies, a `reconsent`
revision that binds later than another policy's pending `reconsent` revision - or than a sibling
policy's first (baseline) revision - must have a strictly newer revision string, or users who
accepted the first are never re-prompted for it. Check every pending `reconsent` revision and new
baseline revision of a sibling policy, including one written in the same change set. If the
later-binding one's revision string is not newer, give the earlier-binding one the later
`effectiveFrom` so both bind on the same day; if the earlier-binding one is already committed, date
the new one after it instead.

### Step 6 - Self-audit the new revision

Before validating, audit what you wrote. Run `audit.md` Phases 1 to 3 for what the new text
states: reuse `facts.md` and `law.md` where they are current, and build the inventory items the
text depends on. Then run Phases 4 to 6 on the sentences this revision adds or changes, in every
locale, and run Phase 5C (MISSING) over the whole new revision. A sentence the revision removes or
weakens is treated as a trim: it goes only when "not required" is established for every regime that
could apply (`audit.md` Phase 8, step 1); otherwise ask the user. Fix every confirmed finding in them, then audit again, until no confirmed findings remain or
only ones that are blocked on the user or fixable only on the system side. List those for the user,
together with any finding in carried-over text - fixing that is `/policykit audit`'s job, with its
own notice, never this revision's. A new revision is where over-promises enter, so this is the
cheapest place to stop them.

### Step 7 - Validate

Run the consumer's own validation - its test suite covers `assertValid()`/`assertValidAll()`
(and a full `next build` exercises the same loader). Every grammar or frontmatter breach throws
a `PolicyValidationError` naming the file and field; fix and re-run until green.

### Step 8 - Review artifact

The git diff IS the review artifact and part of the acceptance-evidence chain: one new dated
directory (two when Step 2's split or Step 5's carrier needs a next-day revision; for an erratum,
an in-place edit), nothing else touched except the audit memory
under `.agentstore/policykit/`. Show it to the user and remind them: committed = published on the
next deploy; never rewrite git history over policy content; and a revision must deploy no later
than its revision date (UTC). If it deploys later, re-plan the whole change set for the deploy day:
shift every revision in it by the same number of days (a next-day carrier stays one day after the
revision it follows), rebase each text on the revisions binding and pending that day, recompute each
`effectiveFrom`, and re-run the Step 5 supersession checks and the tiers they carry - or the real
notice window is shorter than the one it appears to give.
