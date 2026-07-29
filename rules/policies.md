## Policy Editing (@daanvandenbergh/policykit)

A policy version is a DIRECTORY: `<dir>/<revision>/<locale>.mdx`, revision = the `YYYY-MM-DD`
it was decided (the directory name). Committed = published. Most of these rules guard judgement
calls no test can catch.

- **A material change is a NEW revision: a new dated directory with one file per locale, never
  an edit to a published one.** Published text is what users accepted or were notified about;
  rewriting it rewrites the evidence.
- **Material means the meaning moved** - a right, a price, a limit, an obligation, a data
  practice. If you have to ask, it is material.
- **A typo/format/link fix in a published file is an ERRATUM: edit in place.** Git is the errata
  trail. A fake revision per typo re-prompts every user over a comma. If the fix changes what a
  clause means, it was never an erratum - revert and cut a revision.
- **One revision per day.** A second material change folds in ONLY if the first has not deployed;
  otherwise date it tomorrow. Never amend a shipped revision - its notices are keyed to that
  revision string and will not re-send.
- **Every locale of a new revision is translated fresh from the new source text.** A copied-forward
  translation validates green and lies.
- **A new locale starts at the revision that introduces it - never backfill history.** A
  translation minted today is not the historical document.
- **`notice` is the legal decision, recorded per revision:** `none` = non-material, or forced by
  law/security; `notify` = materially reduces what a customer gets; `reconsent` = users must
  expressly accept again. Unsure -> the stricter tier.
- **`effectiveFrom` honours the notice window your own terms promise** (the package only checks
  `>= revision`). Shipping an adverse change dated tomorrow breaches your contract silently.
- **`changeSummary` says what changed and why the tier is right** - one plain-English sentence. It is
  the changelog and the evidence, never user copy.
- **Drafts never sit in the content dir** - a committed dated directory ships on the next
  deploy. Use `drafts/` (ignored) or a branch.
- **Never rewrite git history over policy content.**
