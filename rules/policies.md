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
- **Promise the legal minimum, never more.** Every sentence in a policy is a binding promise the
  business must then actually keep, forever, and can only walk back with a new revision, a notice
  and possibly fresh consent. Write the floor the governing law sets - the statutory period, the
  statutory right, the statutory disclosure - and stop there. Do not volunteer what the law does
  not demand: shorter deletion windows, longer notice periods, uptime or response-time guarantees,
  refunds beyond the mandated ones, rights the statute does not grant, or a competitor's more
  generous clause copied across. Where the law gives a range, take the bound that costs the
  business least. If which law governs (or which customer class - consumer vs business) is
  unclear, ASK - never default to the generous reading.
- **No unbounded absolutes.** "Never", "always", "immediately", "under no circumstances" promise
  more than any operation can guarantee and turn an ordinary incident into a breach. State the
  actual practice, bounded by what the law requires.
- **Trimming an existing over-promise is itself a material change** - it reduces what the customer
  gets, so it is a new revision at `notify` (or `reconsent` if consent hangs on it) with the
  notice window the current terms promise. Never quietly edit a promise away in place.
- **Every locale of a new revision is translated fresh from the new source text.** A copied-forward
  translation validates green and lies.
- **A new locale starts at the revision that introduces it - never backfill history.** A
  translation minted today is not the historical document.
- **`notice` is the legal decision, recorded per revision:** `none` = non-material, or forced by
  law/security; `notify` = materially reduces what a customer gets; `reconsent` = users must
  expressly accept again. Unsure -> the stricter tier. The tier drives the UI: a `none` revision
  is never announced by the takes-effect banner (`pendingNotice`/`PolicyBanner`) and never
  queued for notice - if users should see it coming, it was never `none`.
- **A revision that supersedes a still-pending one carries the surviving obligations itself.**
  policykit never announces or gates consent on a superseded revision (its text never binds), so
  if the superseded change survives in the new text, the new revision records the stricter tier.
- **`effectiveFrom` honours the notice window your own terms promise** (the package only checks
  `>= revision`). Shipping an adverse change dated tomorrow breaches your contract silently.
- **`changeSummary` says what changed and why the tier is right** - one plain-English sentence. It is
  the changelog and the evidence, never user copy.
- **Drafts never sit in the content dir** - a committed dated directory ships on the next
  deploy. Use `drafts/` (ignored) or a branch.
- **Never rewrite git history over policy content.**
