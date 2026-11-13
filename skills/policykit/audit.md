# Audit mode - validate, verify, and cut the policies back to the legal minimum

Read `SKILL.md` first. The legal-minimum doctrine and the seven laws there bind every phase here.
This file is the audit workflow. **It fixes what it finds by default.** `--scan` makes it report
only.

**You are the only legal reviewer these documents will get.** No lawyer reads them after you. So
every finding cites its legal source and its evidence, every "required" and "not required" is
established rather than assumed, and the report states exactly what was **not** checked. A
confident wrong answer is worse than "I could not verify this", because nobody downstream will
catch it.

Three questions, asked of every clause of every in-scope policy:

1. **Is it TRUE?** Checked against what the system actually does (the code, the config, and facts
   the user confirmed). The policy is never evidence of its own claims.
2. **Is it LAWFUL?** Every disclosure an applicable law requires is present and accurate, no term is
   void, unfair, or prohibited, and no right or legal rule is misstated.
3. **Is it the MINIMUM?** Nothing is promised beyond what the law requires, except the commercial
   deal itself and above-floor promises the user deliberately chose to keep.

## Inputs

The arguments after `audit`, parsed in prose:

1. Remove the flags below. What remains is an optional **scope**: a policy slug, or a path to a
   policy directory or legal file. With no scope, audit every configured policy plus the other legal
   text and satellite surfaces found in Phase 0.
2. **`--scan`** - report only. No policy, page, or copy file is changed, and Phase 8 does not run.
   The audit's own memory under `.agentstore/policykit/` is still updated, because it is not policy
   content.
3. **`--out <path>`** - save the report to `<path>` as well. Off by default: the report is written in
   the response. Never assume a report path.
4. **`--refresh-law`** - ignore every cached entry in `law.md` and re-verify each one from the
   primary source.

## Persisted state - `.agentstore/policykit/`

Create the files on first use and keep them committed: they are the project's audit memory, and the
evidence of how each decision was reached.

| File | Holds | Rule |
| --- | --- | --- |
| `facts.md` | The confirmed business facts (Phase 1). Each fact records its value, its source (`repo: <file:line>` or `user: <date>`), and the date it was confirmed. | A fact without a source is not a fact. Re-confirm with the user any fact older than 180 days, or any fact the repo now contradicts. |
| `law.md` | The law ledger (Phase 2). One entry per requirement or floor used: regime, provision, the operative words quoted verbatim, primary-source URL, date fetched. | Re-verify an entry older than 90 days, or every entry with `--refresh-law`. An entry that was never fetched is marked `UNVERIFIED`, and so is every finding that rests on it. |
| `accepted.md` | Above-floor promises the user deliberately keeps: the verbatim clause, the reason, the date, who decided. | Matched on the clause's exact text. If the text changes, the acceptance lapses and the clause is flagged again. Accepted promises still appear in the commitment register. Entries are added only on the user's explicit decision, recording who decided - never on the agent's own judgement. |

## The phases

Run them in order. Phases 1 and 2 are **blocking**: a checklist built on wrong facts or on unverified
law produces a confident, wrong audit.

### Phase 0 - Discover what is in scope

**Managed policies.** Find every `new Policy({ slug, dir, locales, defaultLocale? })` (`SKILL.md`
Step 0) and record each one's `dir`, `locales`, and `defaultLocale`. Work out each revision's status
with the package's own semantics. Compare against today's **UTC** day (`date -u +%F`), and compare
revisions as zero-padded ISO strings, lexically. Never convert them to dates.

- **Binding**: the newest revision whose `effectiveFrom` is on or before today. If none is effective
  yet, audit the newest revision, because that is what the live page shows.
- **Superseded**: some newer revision has an `effectiveFrom` on or before this revision's own. Its
  text never binds.
- **Pending**: not superseded, with `effectiveFrom` after today. Its text binds soon.

Audit the **binding** revision and every **pending** one, in every locale they contain. Older
revisions are evidence. Their text is never edited, but Phase 5G and the notice-window check read
them.

**Unmanaged legal text.** Legal text outside policykit is audited too: an imprint, a cookie policy
kept as a page, legal text in i18n catalogs. Find it in routes, pages, and content files named or
titled `privacy`, `terms`, `tos`, `conditions`, `cookie`, `dpa`, `data-processing`, `legal`,
`imprint`, `impressum`, `refund`, `withdrawal`, `cancellation`, `returns`, `acceptable-use`, `aup`,
`eula`, `subprocessors`, `disclaimer`, or `ccpa`. A policy embedded from a third-party host (a
script tag or iframe from a policy generator) cannot be audited from the repo. Record it as
**uncovered**.

**Satellite promises, always.** Policies are not the only place a business makes binding statements.
Grep the user-facing copy for promise-bearing claims and add each hit to scope as a satellite clause:
signup and checkout consent text, cookie-banner text, pricing and FAQ pages, marketing pages, email
templates, and app-store descriptions if they are in the repo. Typical hits: "cancel anytime",
"money-back guarantee", "free forever", "we never sell your data", "GDPR compliant", "bank-grade" or
"military-grade" encryption, "99.9% uptime", "24/7 support", "your data never leaves the EU",
"end-to-end encrypted", "anonymous". A satellite claim binds the business like the policy does, and
under consumer-protection law it can also be a misleading commercial practice. It must agree with the
policy and with the system.

Write the **scope table**: every document, revision, locale, and satellite surface, with its path. A
surface you found but cannot audit goes on the table as `uncovered: <reason>`.

### Phase 1 - Establish the facts (blocking)

Which laws apply, and whether a clause is true, depends on facts the policy cannot be trusted to
report. **Never take a fact from the policy under audit**, because that would check the text against
itself. Derive what you can from the repo (`reference/fact-sources.md`). Ask the user for the rest in
**one batch**, and offer the repo-derived answer as the default to confirm. Read `facts.md` first and
only ask for what is missing, stale, or contradicted.

The facts every audit needs:

- **Who.** The legal entity's name, legal form, registered address, and country of establishment, plus
  registration and VAT numbers where the policy states them. Whether a data protection officer was
  appointed. Whether an EU or UK representative was designated (only relevant if the entity is
  established outside that territory).
- **Role.** For each processing activity, whether the business is a controller or a processor. A DPA
  is written from the processor side. A privacy policy is the controller's.
- **Markets.** Where the users and customers are: EU/EEA (which member states, at least the main
  ones), UK, Switzerland, US (which states), anywhere else. Whether the business actively directs its
  offer at each one (local language, currency, or domain).
- **Customer class, per document.** Consumers (B2C), businesses (B2B), or both. Consumer law is
  mandatory, business terms are largely free, and a document serving both has to be checked against
  the consumer floor.
- **Service type.** Digital content, a digital service or SaaS, physical goods, a marketplace that
  intermediates for business users, hosting of user content, a communications service, an AI system
  that interacts with people, or financial, health, or children's services. Whether it is paid,
  subscription-based, auto-renewing, or offers free trials.
- **Size.** Only the thresholds an applicable law uses: revenue, user counts, headcount, the share of
  revenue from selling data. Several regimes exempt small businesses (some US state privacy laws, DSA
  micro/small enterprises, EAA microenterprises).
- **Data.** Which categories are collected, from whom (directly or via third parties), whether
  special-category or children's data is involved, any profiling or solely-automated decisions, any
  selling or sharing for cross-context advertising, the processors and sub-processors with their
  locations, and the transfer mechanism for each transfer outside the EEA/UK. Whether the business
  itself is self-certified under the EU-U.S. DPF, its UK Extension, or the Swiss-U.S. DPF (or
  publicly committed to any other certification scheme whose rules dictate privacy-policy content).
- **Binding platform and contract rules.** App stores, API/OAuth providers, payment providers, and
  customer contracts that dictate policy content (for example Apple App Store Review Guideline
  5.1.1, Google's API Services User Data Policy). Each one is a user fact.
- **What the system cannot show.** Backup retention, vendor-side settings, signed DPAs and SCCs,
  office locations, incident-response practice, and support practice. Each is a user question.
- **Surfaces outside the repo.** Where else legal text and customer-facing copy live (a marketing
  site on a CMS, a hosted checkout, an email service, app-store listings). Each one goes on the
  scope table, audited from a copy the user supplies or marked `uncovered`.

If the user is unavailable (a non-interactive run), continue with what is established. Mark every
check that depends on a missing fact as `BLOCKED-ON-FACT`, and never pick a default reading, whether
generous or stingy. Record every confirmed fact in `facts.md` with its source.

### Phase 2 - Determine the applicable law and build the checklist (blocking)

1. **Select the regimes.** Match the facts against the applicability triggers in
   `reference/law-floors.md`. For each regime, record **APPLIES**, **DOES NOT APPLY** (and the fact
   that rules it out), or **UNKNOWN** (and the missing fact). Consumer protection follows the
   consumer: an EU trader directing its offer at consumers in another member state is bound by that
   state's mandatory consumer law too (Rome I Art 6). Audit against the establishment state plus the
   main markets the user confirmed. Any other market served is listed as uncovered. Each APPLIES or
   DOES NOT APPLY rests on the regime's own applicability provision, quoted into `law.md` from the
   primary source (step 3). An unverified trigger makes the regime UNKNOWN, and every DOES NOT APPLY
   goes to a fresh verifier in Phase 6, like a finding.
2. **Build the checklist** for each applicable regime, per document type: (a) the mandatory content,
   (b) the floors (periods, scopes, conditions), (c) the void or prohibited terms.
   `reference/law-floors.md` tells you what to look for. It is a dated lead list, not a source.
3. **Verify every item against the primary source.** Fetch the official text: EUR-Lex for EU law, the
   national official gazette or consolidated-law database for national law, legislation.gov.uk, the
   state legislature's code site, eCFR. Quote the operative words into `law.md` with the URL and the
   date. Also search for amendments, repeals, and new laws since the reference's review date, because
   law moves every year. The reference itself records examples of rules that changed.
4. **If you cannot fetch a source** (no web access, or the page is unavailable), mark the item
   `UNVERIFIED`. Every finding built on it carries that mark, it is never auto-fixed, and the verdict
   cannot be CLEAN.
5. **Regimes the reference does not cover** (for example Brazil's LGPD, Canada's PIPEDA, Australia's
   Privacy Act): research them from the primary source the same way. If you cannot, mark the regime
   uncovered. Never skip it in silence.

### Phase 3 - Build the ground-truth inventory

This is what the system actually does, gathered from the repo by following
`reference/fact-sources.md`. It covers the data collected (schemas, forms, events, logs), cookies and
client storage, third parties (SDKs, scripts, API calls, and the env vars that name them), hosting
and data regions, retention and deletion routines, how data-subject rights are handled (export,
delete, unsubscribe), auth, payments, email, AI and LLM providers that receive user data, and the
consent capture at signup and checkout.

Every item is `present: <file:line>`, `absent: <what was searched>`, or `unknown: <why the repo
cannot show it>`. An unknown item is resolved by a user fact or becomes a QUESTION. Feature-flagged,
dead, and test-only code paths are labelled as such. A dead path is not evidence of practice. A
path gated on a flag or env var whose production value the repo does not show is `unknown`, not
dead: resolve it with a user fact or make it a QUESTION.

### Phase 4 - Build the clause ledger

Split every in-scope document (in its source locale, which for a managed policy is its
`defaultLocale`) into clauses: one per sentence, with each list item and each table row as its own
clause. Record each one in the shape below. For large corpora, fan out one subagent per document.
Each returns rows in this exact shape and nothing else.

```
id:        C-<doc>-<n>
doc:       <document / revision / locale>      location: <heading path or line>
text:      <verbatim>
kind:      COMMITMENT | DISCLOSURE | FACT | LAW | RESERVATION | OBLIGATION | CORE | BOILERPLATE
           (a clause may carry more than one kind - "we delete within 30 days" is COMMITMENT + FACT)
promise:   <for COMMITMENT: what, to whom, by when / how much, and whether it is bounded>
claim:     <for FACT: the factual assertion, matched to an inventory item or "no evidence">
qualified: <any definition, cross-reference, or qualifier elsewhere in the document that changes
            the meaning - always read a clause together with its qualifiers>
```

The kinds are defined in `SKILL.md`, law 1.

**Locales.** The source locale's ledger is the master. Map every clause in every other locale to its
source clause and check that the meaning is equivalent. A translation that says more, less, or
something different is a CONFLICT finding: two texts that differ form an ambiguity, and law 7 resolves
that ambiguity against the business.

**Coverage.** Count the sentences per document and locale, and the ledger rows. If they do not match,
the gap is listed in the report as uncovered.

### Phase 5 - Check every clause, and every gap

Each check emits candidate findings in the Phase 7 shape, ranked with the **Severity** table at the
end of this file.

**A. OVER-PROMISE** - for every COMMITMENT, every FACT that describes the business's own practice
or system (the business has to keep it true), and every satellite promise, find the floor in
`law.md` and compare.

- If no applicable law requires anything like it, the whole commitment is above the floor. The fix is
  deletion, or a reservation, when the business still wants the freedom to do the thing without
  promising it. Before proposing it, check the Phase 1 platform and contract rules: a sentence one of
  them requires is not trimmed - it becomes a QUESTION, and once the user confirms it, it goes in
  `accepted.md` with that source. It stays on the commitment register and must be met.
- If a law requires a weaker version, the fix is the commitment rewritten at exactly the floor (for
  example "without undue delay" in place of "within 24 hours").
- Unbounded absolutes ("never", "always", "all", "any", "immediately", "guarantee", "100%", "fully",
  "completely", "secure", "anonymous") are findings whenever the operation cannot guarantee them.
- Over-specific operational detail the law does not require is a finding: named algorithms, uptime
  figures, response times, backup frequencies, certifications, data-centre locations. A
  certification statement that the certification scheme's own rules require the policy to make (for
  example the DPF's adherence statement and Notice Principle items) is a DISCLOSURE: check it for
  truth, never trim or reword it. Where a law asks for a statement, it asks for the legal standard
  (in a DPA, Art 28(3)(c): the measures required by Art 32), not a specification. GDPR Arts 13-14
  require no security statement; some sector and national rules do (for example US GLBA, 12 CFR
  1016.6(a)(8); Japan APPI Art 32(1)(iv)), so establish "not required" before trimming one.
  Exception: a DPA. Its description of the security measures must be specific enough for the
  controller to assess them (EDPB Guidelines 07/2020, para 126) - in its own schedule, or in an
  annex under the SCCs (Decision 2021/914 Annex II) or the Art 28(7) clauses (Decision 2021/915
  Annex III), which must describe them "in specific (and not generic) terms". Never trim or
  generalise that description, and never replace it with a bare Art 32 reference; check it only for
  truth (UNTRUE if the system does not do it). A DPA with no such description is MISSING.
- Record the **exposure**: does the system meet the promise today (from the inventory)? An above-floor
  promise the system does not meet is a breach already happening and ranks higher.
- `reference/over-promise-patterns.md` catalogues the common cases with their floors and bounded
  rewrites. Use it as leads. The floor still has to come from `law.md`.

**B. UNTRUE** - for every FACT and every satellite claim, compare with the inventory and the facts.

- Contradicted by evidence: **UNTRUE**. For example, "we do not use third-party cookies" while the
  code loads an analytics tag.
- Not settled by evidence: **QUESTION**. Repo absence never settles a negative claim ("we do not use
  X") - see `reference/fact-sources.md`.
- Every CORE term and every commitment on the register is also checked against the inventory. One
  the system does not meet today is an UNTRUE finding (Critical), fixed system-side or asked as a
  question, and never trimmed without the user.
- Also check the reverse direction. Inventory items an applicable law requires the policy to disclose
  but which it does not mention (a processor, a data category, a cookie, a purpose, a transfer) are
  MISSING findings.

**C. MISSING** - for every checklist item of every applicable regime and document type: is it
present, accurate, complete, and placed where the law requires? Some disclosures have placement rules
(the right to object - to direct marketing, and to processing based on Art 6(1)(e) or (f) - has to
be presented "clearly and separately", GDPR Art 21(4); an opt-out link has to sit on the site
itself, not only in the policy). A disclosure that is present but too vague for the law is MISSING
too. Be specific enough to satisfy the law, and no more
specific.

**D. MISLAW** - for every LAW clause, compare with the quote in `law.md`: periods, conditions,
exceptions, the scope of rights, the authority named, the article numbers, and whether the rule has
been repealed. The error can run either way:

- A right or rule stated for a regime marked DOES NOT APPLY is not a statement of law but a
  voluntary grant. Check it under A as a COMMITMENT (the Phase 8 trim guard still applies). For a
  regime marked UNKNOWN, it is a QUESTION, never a trim.
- A right stated wider than the regime's own personal or territorial scope (GDPR Art 3; a state
  law's definition of resident or consumer) is, for the people outside that scope, a voluntary
  grant. Check that part under A as a COMMITMENT. The Phase 8 trim guard still applies, because
  another regime may grant the same right to them.
- A right stated more generously than the statute is an over-promise as well, because a policy that
  grants a right can be held to it.
- A right stated more narrowly than the statute misleads people about their statutory rights, and in
  consumer terms it is often void.
- A reference to a repealed rule is MISLAW. For example, the link to the EU ODR platform, which was
  discontinued on 20 July 2025.

**E. UNLAWFUL** - for every RESERVATION, OBLIGATION, exclusion, and CORE term, check against the void
and prohibited lists for each applicable regime. For every DISCLOSURE and FACT, and every inventory
item, also check the practice itself against the checklist floors (non-essential storage before
consent, a pre-ticked box, a legal basis the cited provision does not support). A practice below the
floor is a system-side UNLAWFUL finding, however truthfully the text describes it. Every satellite
claim is also checked against practices banned outright (for example UCPD Annex I in the EU, DMCCA 2024 Schedule 20 in the UK): a hit
is UNLAWFUL even when the claim is true. Examples: liability exclusions the law does not
allow, waivers of statutory consumer rights, "no refunds" where a withdrawal right or conformity
remedy exists, unilateral changes with no valid reason and no right to terminate, choice-of-law or
forum clauses that hide the consumer's own mandatory law or home forum, and auto-renewal terms that
break the renewal rules. An unenforceable clause is not harmless dead text. In several jurisdictions
using it is itself actionable, by regulators, consumer associations, or competitors.

**F. CONFLICT** - one subject, two different statements. Check across documents (privacy vs cookie
policy vs terms vs DPA), across locales, between a policy and a satellite surface, between a policy
and the consent text users actually click, and between a document and anything it cross-references
(a referenced document or section has to exist).

**G. REVISION** - the versioning record is legal evidence (`rules/policies.md`). Check it for every
managed policy:

- **Notice tier vs the diff.** Diff each in-scope revision against the newest earlier revision that
  is not superseded (the text that binds until it takes effect). A change that
  reduces what the customer gets, recorded as `none`, is a finding. If you are unsure, the stricter
  tier is right. A `none` revision is never announced to users, so if they should have seen it coming,
  it was never `none`.
- **Legacy terms promises.** A terms promise an earlier revision made and a later one trimmed still
  binds the customers it could not reach (see Phase 8, "Promises a revision cannot take back"): put
  it on the commitment register as `legacy: <who>` and check it like any commitment (5B).
- **Legacy privacy promises.** Where US users are in scope, compare the binding revision with every
  earlier revision that bound. A privacy promise that an earlier revision made and a later one
  removed or weakened (a new purpose, new recipients, model training, longer retention, a promise
  withdrawn) still binds the data collected while it stood - unless a later revision's text applies
  the change only to data collected after its `effectiveFrom`; a `reconsent` revision releases only
  the users who accepted it. Put each such promise on the commitment register as
  `legacy: data collected before <effectiveFrom>` and check it against the inventory like any
  commitment (5B). One the system does not meet today is an UNTRUE finding (Critical), fixed
  system-side or asked as a question.
- **Notice window.** `effectiveFrom` minus the revision date must be at least the change-notice period
  promised by the revision that was **binding when the change was published**. Read that revision's
  change clause; there may be tiers, for example consumer vs business, or exceptions for changes
  forced by law or security. It must also meet any statutory notice floor (for example the P2B
  Regulation's notice for business users: at least 15 days, longer where they need time to adapt).
  A short window breaches the business's own contract. A change carried over from a superseded
  revision (`SKILL.md` Step 5) - by the revision that superseded it, or by the next-day revision that
  carries it - is measured from the superseded revision's date, not the carrier's.
- **Published text edited in place.** Run `git log -p --follow` on each published revision file. An
  in-place edit after first publication that changed meaning, rather than fixing a typo, formatting,
  or a link, rewrote the evidence. It should have been a new revision.
- **Translations.** A locale that is identical to another locale, or that renders an older revision's
  text instead of its own revision's source, was copied forward rather than translated fresh.
- **changeSummary.** It has to describe what the diff actually changed, and justify the tier.
- **Superseded tiers.** A superseded revision (Phase 0), including one that was binding on the day
  it was superseded, never moves the consent gate and is never queued. If its `reconsent` or
  `notify` change survives in a later revision, the revision that carries it must record that tier
  itself.
- **Cross-policy reconsent order.** For the policies gated together (the consumer's
  `requiredConsentRevision` call), any `reconsent` that binds after a sibling's `reconsent` (or a sibling's baseline revision) with an
  equal or newer revision string is a finding (High). The fix follows `SKILL.md` Step 5.

### Phase 6 - Adversarial verification (fresh subagents)

No finding reaches the report, or the fix phase, until a **fresh subagent** has tried to refute it:
one that did not produce it and has none of the producing context. Batch the candidates, about ten
per verifier, grouped by document. Give each verifier the clause verbatim with its qualifiers, the
claimed floor with its `law.md` quote and URL, the inventory evidence, the relevant facts, and the
proposed rewrite. The verifier tries each refutation and returns `CONFIRMED`,
`REFUTED: <which and why>`, or `UNCERTAIN: <what would settle it>`:

- **R1 - The floor is wrong.** Re-fetch the source. Was it misread, superseded, amended, or not yet in
  force?
- **R2 - The regime does not apply.** Check the facts: customer class, market, size, service type, or
  role.
- **R3 - The clause does not say that.** Read it in context, with its definitions, qualifiers, and
  cross-references. A qualifier that only makes the clause ambiguous does not refute it. Consumer
  terms are read in the consumer's favour (93/13/EEC Art 5; CRA 2015 s69), and many governing laws
  read standard business terms against the drafter too (for example BGB §305c(2)). An ambiguity is a
  reason to fix the text, never to drop the finding.
- **R4 - The evidence is wrong.** A dead code path, a feature flag shown to be off in production (by
  committed production config or a confirmed user fact; a flag or env var whose production value is
  set outside the repo, such as in the host's dashboard, is `unknown`, never off), a test fixture, or
  a dependency installed but never called.
- **R5 - The rewrite falls below the floor**, or drops an element the law requires.
- **R6 - The rewrite creates a new promise**, a new ambiguity, or a new untrue statement.
- **R7 - The trim, or a term written in place of a void one, cannot bind existing customers.** Is
  there a valid change mechanism for it, or does it need fresh acceptance? (The answer feeds the
  notice tier in Phase 8.)

R1 to R4 test the finding; R5 to R7 test the fix.

- A finding REFUTED on R1-R4 is dropped and listed in the report's appendix with the reason. A
  finding UNCERTAIN on R1-R4 becomes a QUESTION.
- A finding REFUTED on R2 because the regime does not apply to the whole document also re-marks
  that regime, for that document, as DOES NOT APPLY (UNKNOWN if UNCERTAIN), and that re-mark goes to
  a fresh verifier like any Phase 2 DOES NOT APPLY. A refutation that holds only for that clause (a
  business-only section, a feature not offered in that market) re-marks nothing. Re-run Phase 5D/5A
  for every clause that rested on a re-marked regime and send the new candidates through this
  phase.
- A DOES NOT APPLY (Phase 2) that the verifier REFUTES becomes APPLIES, and one it leaves UNCERTAIN
  becomes UNKNOWN. For a regime that now APPLIES, run Phases 2 to 5 for it and send its candidates
  through this phase before Phase 8 or the report. If verifiers disagree on whether a regime applies,
  it is UNKNOWN - never re-verify in a loop.
- A finding refuted only on R5 or R6 stays CONFIRMED: write a new rewrite and verify it again. If no
  rewrite can be both true and at or above the floor (a statement the law requires that the system
  does not meet), the text stays and the fix is system-side.
- A rewrite UNCERTAIN on R5 or R6 is never applied: write a new one and verify it again, or make
  the finding a QUESTION.
- R7 never refutes. Its answer sets the notice tier in Phase 8.

A refutation needs evidence, exactly as a finding does: one under R1, R2, or R5 quotes its primary
source with the URL, one under R3 quotes the definition, qualifier, or cross-reference that changes
the meaning, and one under R4 cites file:line. A refutation without that is UNCERTAIN, not
REFUTED. A verifier never verifies its own work, and the main agent never overrules a refutation
without new evidence.

**The cold read.** Separately, for each document, give one fresh subagent only the document,
`facts.md`, `law.md`, and the inventory. Do not give it the ledger or the findings. Ask it for every
over-promise, missing disclosure, untrue statement, and misstated law it can find. Anything it reports
that is not already a finding becomes a new candidate and goes through the same refutation. This is
the check that catches what the clause-by-clause pass was structurally unable to see.

**No subagents available?** Run the refutation and the cold read yourself, as separate passes after
the checks, and stamp the report "verification: single-agent". A single-agent pass can never produce
a CLEAN verdict.

### Phase 7 - Report

Without `--scan`, run Phase 8 first and write this report after it, so the verdict and each
finding's status record what was actually fixed. The report has these sections, in this order:

1. **Verdict.**
   - `CLEAN`: no confirmed findings, full coverage, every law item verified, every needed fact
     confirmed, no open questions, verification by fresh subagents, and every commitment-register
     line met today.
   - `FIXED`: every confirmed finding was fixed, the re-audit of the new text (Phase 8) has no
     findings, and every other CLEAN condition holds. A fix in a revision that is not yet binding
     counts as fixed only from its `effectiveFrom`. While any UNTRUE, MISSING, or UNLAWFUL finding,
     or any OVER-PROMISE whose exposure is NOT met today, stays open against the binding revision,
     the verdict reads `FINDINGS - fixed from <latest effectiveFrom>` and lists each such finding
     with its system-side option. It reads `FIXED from <latest effectiveFrom>` only when every
     pending fix trims an over-promise the system meets today.
   - `FINDINGS`: confirmed findings remain (always the case under `--scan` when any were found).
   - `INCOMPLETE`: any coverage gap, `UNVERIFIED` law, `BLOCKED-ON-FACT` check, UNKNOWN or uncovered
     regime or surface, open question, or single-agent verification. INCOMPLETE takes precedence over
     CLEAN and FIXED, never the reverse. When FINDINGS and INCOMPLETE both hold, the verdict is
     `FINDINGS + INCOMPLETE`.
2. **Scope.** The scope table from Phase 0, including what is uncovered and why.
3. **Facts used.** Each fact with its source.
4. **Regimes.** Each regime marked APPLIES, DOES NOT APPLY, or UNKNOWN, with the fact that decided it.
   Also the count of law items verified against the count `UNVERIFIED`.
5. **Findings**, most severe first, one block each:
   ```
   PK-<nnn>  <CLASS>  <Severity>   <doc / revision / locale> @ <location>
   Clause:    "<verbatim>"
   Problem:   <one sentence>
   Law:       <provision> - "<operative words>" (<URL>, fetched <date>) | UNVERIFIED
   Evidence:  <inventory item file:line | fact source | "none - see question">
   Exposure:  met today | NOT met today | n/a
   Fix:       "<replacement text>" | delete | add "<text>" at <location> | system-side: <what to change>
   Notice:    <what this change owes the users - Phase 8 rules>
   Status:    fixed in <revision / file> | not applied: <reason> | scan only
   ```
6. **The commitment register.** Every COMMITMENT that survives: the clause, its basis
   (`law: <provision>`, `core`, or `accepted: <date>`), and whether the system meets it today. This is
   the list of what the business has promised. Every line on it must be one the business can keep.
7. **Questions for the user**, each with the finding or check it unblocks.
8. **Refuted candidates** (appendix), each with the refutation reason. This shows the review was done.
9. **The honesty clause**, verbatim, every run:

   > This review was carried out by an AI model, not a lawyer. It checked the policy text against
   > the primary legal sources it retrieved and cites above, and against the facts it could verify in
   > this repository or that you confirmed. It is not legal advice and does not certify compliance.
   > It is least reliable where a regime is marked uncovered or UNKNOWN, a source is marked
   > UNVERIFIED, or a fact is unconfirmed.

With `--scan`, stop here.

### Phase 8 - Fix (default; skipped by `--scan`; runs before the report is written)

1. **Apply only CONFIRMED findings that have a text fix.** QUESTIONS, `UNVERIFIED` findings, and
   system-side fixes are reported, never applied. A clause recorded in `accepted.md` is never
   rewritten. When an untrue statement could be fixed either by changing the text or by changing the
   system, change the text so that it matches what the system does today, and report the system-side
   option - unless the statement is one the law requires (a mandatory disclosure, or a statutory
   duty the system does not meet), a CORE term, or a commitment on the register (Phase 5B). Then the
   text stays and the fix is reported as system-side or asked as a question.
   And if the practice itself is unlawful (non-essential cookies set before consent, a pre-ticked
   consent box), a text that describes it truthfully does not close the finding: it stays open as a
   system-side UNLAWFUL finding, and the verdict cannot be CLEAN or FIXED. Never edit application
   code.
   **A deletion or weakening is applied only when "not required" is established for every regime
   that could apply to that document, and no platform or contract rule from Phase 1 requires it.** If any such regime is UNKNOWN, any market served is
   uncovered, or any check it depends on is BLOCKED-ON-FACT, the trim is a QUESTION, never applied.
2. **Errata** (a typo, a broken link, formatting, or a translation slip that does not change meaning)
   are edited in place. Git is the errata trail.
3. **Everything else changes meaning.** That includes trimming an over-promise, adding a missing
   disclosure, correcting an untrue statement, and fixing misstated law. For a managed policy it is a
   **new revision**, written exactly as `SKILL.md` Steps 2 to 5 describe: a new dated directory with
   every configured locale translated fresh, never an edit to a published revision. In particular:
   - **`notice`** is the strictest tier any change in the revision needs. Trimming an over-promise
     reduces what the customer gets, so it is at least `notify`. Use `reconsent` when consent depends
     on the change, or when the trim cannot otherwise bind existing customers (R7). Use `none` only
     for changes that owe no notice: non-material ones, or ones forced by law or security - and
     never where an applicable regime requires notifying the change itself (P2B Art 3(2): any proposed
     change to business-user terms; DSA Art 14(2): any significant change), even when that regime
     lifts the notice period. If unsure, take the stricter tier.
   - **Promises a revision cannot take back.** Where R7 finds that a trim cannot bind some existing
     customers (a contract already performed or prepaid under the old text: a one-off purchase, a
     lifetime licence or access deal, a warranty or guarantee, a prepaid term; or anyone who does not
     accept a `reconsent` revision), the old promise still binds them. Keep it on the commitment
     register as `legacy: <who, e.g. purchases before <effectiveFrom>>`, check that it is met today,
     and report the finding as fixed only for the others. Never use `reconsent` to take back an
     entitlement customers already paid for without asking the user.
   - **`effectiveFrom`** is at least the revision date plus the change-notice period the binding
     revision promises, and at least any statutory floor. A correction the law forces (an untrue
     statement of practice, a void term, a missing mandatory disclosure) may take effect immediately
     only if the binding revision's change clause, or the law, allows immediate changes of that kind.
     For a void term, only its removal is forced, and only toward the customers it cannot bind (for
     example consumers, or residents of one market): toward them it never bound, and the contract runs
     on without it (CJEU C-618/10 *Banco Español de Crédito*, para 65). Where it validly binds other
     customers (businesses, other markets), the immediate revision keeps it for those customers only,
     unchanged in substance and to the extent it binds them ("If you are acting for a business, ...")
     - that is not new to them and owes no notice. Any limitation, cap, exclusion, or reservation newly
     applied to the customers the term could not bind (a lawful cap in place of a void total
     exclusion, "non-refundable except ..." for a void "no refunds", a choice of law restated with the
     consumer caveat) is new to them: it owes the tier and notice window of a trim, tested with R7,
     and goes in the revision that carries the trims.
     A correction that makes a COMMITMENT weaker (the text promised more than the system does) is a
     trim, never an immediate correction: it owes the tier and the notice window of a trim, and the
     system-side option is reported meanwhile.
     When a batch mixes immediate corrections with trims that owe notice, write two revisions: one
     dated today, effective immediately, with the corrections only; and one dated the next day, with
     the notice window, whose text carries the corrections plus the trims. The immediate one then
     binds now and the second is pending. If pending revisions exist, the immediate one
     supersedes them all: their changes go into the second revision only (`SKILL.md` Step 5),
     effective no earlier than the latest `effectiveFrom` among them. Write that second revision even
     when there are no trims. If the immediate one is dated today and the binding revision's
     `effectiveFrom` is today, the immediate one supersedes it too: it already carries that text, so it records that revision's tier when that
     tier is stricter.
   - **A pending revision with a wrong tier or too short a window** (Phase 5G) is fixed by
     superseding every pending revision. If this run writes an immediate revision, that one already
     does. Otherwise write one revision dated today, effective the next day, with the binding
     revision's text, tier `none`, and no other change (effective the next day so that it supersedes
     the pending ones but never the binding one, even when that took effect today). Every other change
     of this run, plus the latest pending revision's text (which carries every earlier pending
     change), then goes into the single revision dated the next day. That revision records the
     strictest correct tier of everything it carries, and takes effect no earlier than the latest
     pending `effectiveFrom` and at least a full window after its own revision date. A revision
     effective after the pending one does not fix it, because the pending one still binds first.
   - **If `effectiveFrom` or the tier cannot be settled** (the binding revision has no readable change
     clause, or R7 is UNCERTAIN), ask the user. In a non-interactive run, write the revision under
     `<dir>/drafts/<date>/` instead, where the loader ignores it, and list it under Questions. When a
     parked draft is published, it is re-planned for that day as `SKILL.md` Step 8 describes - a
     draft promoted under its old date would shorten the real notice window while still looking
     compliant. If a pending revision exists and the revision that would
     carry its changes is parked, park the immediate revision with it.
   - **`changeSummary`** is one plain-English sentence: what changed, and why the tier is right.
   - **US privacy promises.** Applying a less protective privacy promise to data already collected
     under the old one can require the users' affirmative express consent. That is the FTC's
     long-held position on retroactive material changes. Where such a trim reaches US users, write it
     so it applies only to data collected after it takes effect, or ask the user. The old promise
     still binds data collected before that date: keep it on the commitment register as
     `legacy: data collected before <effectiveFrom>`, check that it is met today, and report the
     finding as fixed only for data collected after that date.
   **Unmanaged legal text and satellite surfaces**: errata, and corrections the binding change clause
   or the law allows to take effect immediately, are edited in place. Satellite copy that lives in
   application code is edited only as a string literal, never its logic. Satellite copy that no
   customer's terms incorporate (marketing, pricing, FAQ, and signup or checkout text shown before the
   contract is made) binds only the customers who contract while it is shown, so a trim of it is
   applied in place: it stops the promise reaching new customers. The old claim still binds
   customers who signed up while it was shown - keep it on the commitment register as
   `legacy: customers who signed up before <deploy date>`, check that it is met today, and ask the
   user whether to change those customers' deal through the terms' own change mechanism. Copy that
   the terms incorporate by reference ("as described on our pricing page"), and unmanaged legal text,
   are changed only with the notice their change clause requires: any such change that owes notice
   is not applied - report its replacement text with
   `Status: not applied: owes <notice> before it may go live`. Delivering notices is the project's
   job.
4. **Re-audit what you wrote.** Run Phases 4 to 6 again on the new text, with fresh subagents, and
   run Phase 5C (MISSING) over each whole new revision and Phase 5F (CONFLICT) across it, the other
   documents, and the satellite surfaces - a deletion leaves no new text, but can still remove the
   only sentence that met a mandatory disclosure. A rewrite can introduce exactly the defects this
   skill hunts. Loop until the new text has no confirmed findings, or only ones blocked on the user or fixable only on the system side.
5. **Validate.** Run the project's own checks: the test suite that calls `assertValid()` /
   `assertValidAll()`, or a build. Fix what throws until it is green.
6. **Write the report (Phase 7), show it with the diff, and stop.** Never commit, never push, never
   deploy. Remind the user that a committed dated directory is published on the next deploy, and list
   the notices the new revisions owe. Tell the user these revisions must deploy no later than their revision
   date (UTC). One that deploys later is first re-planned as `SKILL.md` Step 8 describes.

## Severity

Severity ranks how much harm the defect can do. Class and severity are independent of each other.

| Severity | Meaning | Typical classes |
| --- | --- | --- |
| **Critical** | Unlawful or untrue now, with regulatory or contractual exposure today. | UNTRUE about data practices, security, or third parties. MISSING mandatory disclosure under an applicable regime. UNLAWFUL term. MISLAW that understates a statutory right. An OVER-PROMISE the system does NOT meet today. |
| **High** | A binding obligation the law does not require, which is costly, unbounded, or hard to keep. A revision-hygiene breach of the business's own notice clause. | OVER (an absolute, an SLA, a deadline shorter than the statutory one), REVISION (notice window, tier). |
| **Medium** | Above the floor but currently met, or an inconsistency that changes meaning. | OVER (met today), CONFLICT (between locales or documents), MISLAW that is overstated but harmless. |
| **Low** | No change of meaning: wording, typos, broken links, formatting. | Errata. |
| **Question** | Cannot be decided without a fact or decision from the user. | UNVERIFIED facts, UNKNOWN regimes, accepted-or-trim decisions. |

Something the law does not require that is merely absent is **never** a finding. Recommending
"best-practice" additions is exactly the over-promising this skill exists to prevent.
