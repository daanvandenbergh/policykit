---
name: policykit
description: Add or update a versioned legal policy revision managed by
    @daanvandenbergh/policykit - decide material-change-vs-erratum, create the dated
    revision directory with one MDX file per locale, set the notice tier and effective
    date, and validate. Use when the user wants to add a policy revision, update or
    change the terms of service / privacy policy / DPA or any legal policy, publish a
    policy change, fix a typo in a policy, or asks about a policy's notice tier or
    effective date ("add a policy revision", "update the terms", "publish the privacy
    policy change", "when does the new DPA take effect?").
user-invokable: true
argument-hint: "[policy slug or description of the change - omit to be asked]"
---

# policykit - author a policy revision

This skill edits content consumed by `@daanvandenbergh/policykit`. A policy lives in a
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

The editing judgement calls (material vs erratum, one revision per day, fresh translations,
never rewriting history) live in `rules/policies.md`, shipped beside this skill - read it first
and treat it as binding. The steps below are the workflow; the rules are the law.

## Step 0 - Locate the policy and its config

Find the consumer's `Policy` instances. Note the target policy's `dir`, `locales`, and
`defaultLocale` (default `"en"`) - they decide which files the new revision needs. If the user
did not name a policy, ask which one (list the configured slugs).

## Step 1 - Material change or erratum?

**Material means the meaning moved**: a right, a price, a limit, an obligation, a data practice.
If you have to ask, it is material.

- **Erratum** (typo, broken link, formatting, translation wording that does not change meaning):
  edit the published file IN PLACE and stop after validation - git is the errata trail. Never
  cut a revision for an erratum: a fake revision would flip the consumer's consent gates and
  re-prompt every user over a comma.
- **Material**: continue - this is a new revision.

## Step 2 - Pick the revision date

The revision date is TODAY (the day the change is decided), zero-padded `YYYY-MM-DD` - it
becomes the directory name and the revision's whole identity. One revision per day: if today's
directory already exists AND has already deployed, date the new revision tomorrow; if it exists
but has NOT deployed, fold the change into it. Never amend a shipped revision.

## Step 3 - Create the revision directory

Create `<dir>/<date>/` with one `<locale>.mdx` per configured locale (grammar:
`^[a-z]{2}(?:-[A-Z]{2})?\.mdx$` - e.g. `en.mdx`, `nl.mdx`, `nl-NL.mdx`). Rules:

- **Every locale is translated FRESH from the new source text** - never copy an old translation
  forward.
- Every file needs a non-empty MDX body - a file that is frontmatter with no document text
  fails validation.
- A NEW locale starts at the revision that introduces it - never backfill older revision
  directories (the loader enforces contiguity: once introduced, a locale must exist for every
  later revision, and may not exist for earlier ones).
- Nothing else goes in the directory - no images, no notes, no `.txt`. Work in progress that
  must be committed goes in `<dir>/drafts/`, never as a dated directory: **a committed dated
  directory IS published** and becomes `latest` on the next deploy.

## Step 4 - Frontmatter (default-locale file ONLY)

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
| `none` | Non-material, or a change forced by law/security that owes no notice | Nothing queued; no takes-effect banner; consent gate unmoved |
| `notify` | Materially reduces what a customer gets, but existing consent stands | Queued for notice and announced by the banner; NEVER re-prompts consent |
| `reconsent` | Users must expressly accept again | Queued and announced, AND moves `requiredConsentRevision` from its `effectiveFrom` day |

Unsure -> the stricter tier.

## Step 5 - Set `effectiveFrom`

A real `YYYY-MM-DD` calendar day, `>=` the revision date (the package validates both - an
impossible date is an error, including unquoted YAML dates that would otherwise roll over to a
different day). The gap between the two IS the notice window - and the window you must grant
comes from **the consumer's own published terms** (its change-notice clause), not from this
package. Read the consumer's current terms for the promised period (there may be tiers, e.g.
business vs consumer, and legal exceptions - a change forced by law or security may be
immediate). Shipping an adverse change effective tomorrow breaches the consumer's own contract
silently; when in doubt, ask the user what window applies.

One supersession consequence to check: an immediate revision shipped while an earlier revision's
notice window is still running SUPERSEDES it - the pending text will never bind, and policykit
stops announcing it (`pending()`, `pendingNotice`, and `noticeQueue` exclude it) and never gates consent on it
(`requiredConsentRevision` skips it). Make sure the new revision's text incorporates whatever
the superseded revision was meant to change, or that dropping it is intended - and if the
superseded revision was `reconsent` tier and its change survives in the new text, record
`reconsent` on the NEW revision, because the superseded one no longer moves the consent gate.

## Step 6 - Validate

Run the consumer's own validation - its test suite covers `assertValid()`/`assertValidAll()`
(and a full `next build` exercises the same loader). Every grammar or frontmatter breach throws
a `PolicyValidationError` naming the file and field; fix and re-run until green.

## Step 7 - Review artifact

The git diff IS the review artifact and part of the acceptance-evidence chain: one new dated
directory (or, for an erratum, an in-place edit), nothing else touched. Show it to the user and
remind them: committed = published on the next deploy; never rewrite git history over policy
content.
