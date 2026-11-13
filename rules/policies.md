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
- **One revision per day.** A second material change folds into today's revision ONLY if it is
  still uncommitted and one `effectiveFrom` and tier serve both changes without shortening a notice
  window or delaying an immediate change. If today's revision is committed, date the new one
  tomorrow; if it is uncommitted but they cannot share, keep the immediate changes in today's
  directory and move everything that owes notice to tomorrow's. Never amend a shipped revision - its
  notices are keyed to that revision string and will not re-send.
- **Promise the legal minimum, never more.** Every sentence in a policy is a binding promise the
  business must then actually keep, forever, and can only walk back with a new revision, a notice
  and possibly fresh consent. Write the floor the governing law sets - the statutory period, the
  statutory right, the statutory disclosure - and stop there. Do not volunteer what the law does
  not demand: shorter deletion windows, longer notice periods, uptime or response-time guarantees,
  refunds beyond the mandated ones, rights the statute does not grant, or a competitor's more
  generous clause copied across. Where the law lets the business choose within a range, take the
  bound that costs the business least, with every condition the law attaches to it - a default
  period with a conditional extension is stated as the default plus its condition, never as the
  outer limit. If which law governs (or which customer class - consumer vs business) is
  unclear, ASK - never default to the generous reading.
- **The floor comes from the primary legal source, never from memory.** Verify the statute's own
  words before writing a period, a right, or a "required" into a policy - and never cut below the
  floor on a guess either: deleting a mandatory disclosure is worse than keeping an extra sentence. Text an app store,
  API provider, or customer contract the business is bound by requires is kept on the user's
  decision, never trimmed as "not legally required".
- **Every fact a policy states must be true of the system** - the processors, the cookies, the
  retention, the data regions, the consent flow. Check it against the code and the user, never
  against the policy itself. `/policykit audit` runs these checks across every policy.
- **No unbounded absolutes.** "Never", "always", "immediately", "under no circumstances" promise
  more than any operation can guarantee and turn an ordinary incident into a breach. State the
  actual practice, bounded by what the law requires.
- **Trimming an existing over-promise is itself a material change** - it reduces what the customer
  gets, so it is a new revision at `notify` (or `reconsent` if consent hangs on it) with the
  notice window the current terms promise. Never quietly edit a promise away in place.
- **A less protective privacy change never reaches data already collected on notice alone.** Where
  US users are in scope, it applies only to data collected after it takes effect, unless users give
  affirmative express consent (the FTC's position on retroactive material changes). In the EU and UK
  a new purpose also needs its own legal basis and prior information (GDPR Arts 6(4), 13(3)). A
  notice banner is not consent.
- **Every locale of a new revision is translated fresh from the new source text.** A copied-forward
  translation validates green and lies.
- **A new locale starts at the revision that introduces it - never backfill history.** A
  translation minted today is not the historical document.
- **`notice` is the legal decision, recorded per revision:** `none` = non-material, or forced by
  law/security, and owing no notification under any applicable law (P2B Art 3(2) and DSA Art 14(2)
  require notifying changes even then); `notify` = materially reduces what a customer gets; `reconsent` = users must
  expressly accept again. Unsure -> the stricter tier. The tier drives the UI: a `none` revision
  is never announced by the takes-effect banner (`pendingNotice`/`PolicyBanner`) and never
  queued for notice - if users should see it coming, it was never `none`.
- **A revision SUPERSEDES every earlier one whose `effectiveFrom` is on or after its own** - a
  pending one, or the binding one when that took effect today. A superseded revision is never
  announced, never gates consent, and never binds (again). Superseding a still-pending one must
  never cut its notice short. Surviving superseded
  changes go in a revision effective no earlier than the superseded one's `effectiveFrom` (the latest
  one's, when several are superseded) - if the
  new revision takes effect earlier, carry them in a second revision dated the next day. Whichever
  revision carries a superseded revision's changes records its tier when stricter. A new revision
  effective AFTER a pending one does not supersede it: build its text from the pending revision's.
- **Jointly gated policies take reconsent in revision order.** `requiredConsentRevision` keeps one
  max revision string across the policies passed together. A `reconsent` that binds after another
  policy's `reconsent` or baseline revision with an equal or newer revision string never re-prompts
  anyone. Give such revisions the same `effectiveFrom` by moving the earlier-binding one later; if
  that one is already committed, date the new one after it instead.
- **`effectiveFrom` honours the notice window your own terms promise** (the package only checks
  `>= revision`). Shipping an adverse change dated tomorrow breaches your contract silently.
- **`changeSummary` says what changed and why the tier is right** - one plain-English sentence. It is
  the changelog and the evidence, never user copy.
- **Drafts never sit in the content dir** - a committed dated directory ships on the next
  deploy. Use `drafts/` (ignored) or a branch.
- **Never rewrite git history over policy content.**
