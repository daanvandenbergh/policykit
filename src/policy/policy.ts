import path from "node:path";
import { PolicyValidationError } from "./errors.js";
import { loadPolicy, type CacheEntry, type LoadedRevision } from "./load.js";
import type { PolicyConfig, PolicyContent, PolicyRevision } from "./types.js";

/**
 * Formats an instant as the UTC calendar day (`YYYY-MM-DD`) - the package's pinned timezone
 * convention. Every `now`-based comparison ("does this revision bind yet?") reduces the `Date`
 * to this string and compares lexicographically against the stored date strings, so a revision
 * takes effect at UTC midnight of its `effectiveFrom` day, everywhere, deterministically -
 * never at server-local midnight.
 *
 * @param now - the instant to reduce.
 * @returns the UTC day as a zero-padded ISO string.
 */
function isoDay(now: Date): string {
    return now.toISOString().slice(0, 10);
}

/**
 * Flags the revisions that will NEVER bind: a revision is superseded when any NEWER revision
 * takes effect on or before its own effectiveFrom day - by the newest-binds rule that newer
 * revision is always selected from the superseded one's effective day onward, so the
 * superseded text never binds for a single moment. This is legal and expected (an immediate
 * law/security revision shipped while an earlier revision's notice window is still running);
 * superseded revisions stay in the archive, but `pending()` and `noticeQueue` exclude them -
 * announcing a text that will never bind is misinformation in a legal context.
 *
 * @param revisions - the revisions, ascending by revision date.
 * @returns one flag per revision, `true` = superseded (never binds).
 */
function supersededFlags(revisions: readonly { effectiveFrom: string }[]): boolean[] {
    const flags = new Array<boolean>(revisions.length);
    let soonestNewer: string | undefined;
    for (let i = revisions.length - 1; i >= 0; i--) {
        const effectiveFrom = revisions[i].effectiveFrom;
        flags[i] = soonestNewer !== undefined && soonestNewer <= effectiveFrom;
        if (soonestNewer === undefined || effectiveFrom < soonestNewer) {
            soonestNewer = effectiveFrom;
        }
    }
    return flags;
}

/**
 * Converts an internal loaded revision to the public {@link PolicyRevision} shape (dropping the
 * parsed file map, which only `Policy.content` serves from).
 *
 * @param rev - the loaded revision.
 * @returns the public revision.
 */
function toPublic(rev: LoadedRevision): PolicyRevision {
    return {
        revision: rev.revision,
        effectiveFrom: rev.effectiveFrom,
        notice: rev.notice,
        changeSummary: rev.changeSummary,
        locales: [...rev.files.keys()],
        title: rev.title,
    };
}

/**
 * One versioned policy document (terms of service, privacy policy, DPA, ...), backed by a
 * directory where a version IS a directory: `<dir>/<YYYY-MM-DD>/<locale>.mdx`, the date-named
 * directory being the revision's whole identity. The class answers the three questions a
 * consumer has - which revision binds right now, what notice is owed, and render revision X in
 * locale Y (old revisions included; they ARE the version archive).
 *
 * Construction stores config and does ZERO filesystem access; all IO is lazy and per-file
 * memoized. This is a hard rule: consumers hold module-scope instances transitively imported by
 * their auth layer, so a malformed policy file must produce a loud error at first USE (failing
 * `next build` during page-data collection and `assertValid()` in tests), never an import-time
 * crash that takes the whole app down at boot. The directory walk itself is never memoized -
 * every accessor re-walks (the corpus is tiny), so `next dev` sees edits live and validation
 * errors re-throw on every call.
 */
export class Policy {
    /** The policy's identifier, e.g. `"terms-of-service"`. */
    readonly slug: string;
    /** The locales this policy serves, as configured. */
    readonly locales: readonly string[];
    /** The absolute policy directory. */
    private readonly dir: string;
    /** The resolved default locale (validated to be in `locales`). */
    private readonly defaultLocale: string;
    /** The per-instance parse cache, keyed by absolute file path; see `load.ts`. */
    private readonly cache = new Map<string, CacheEntry>();

    /**
     * Stores the config after validating what needs no IO: `dir` must be absolute (the consumer
     * runs the same instance from several working directories - a relative path would resolve
     * differently per cwd) and `defaultLocale` must be one of `locales`.
     *
     * @param config - see {@link PolicyConfig}.
     * @throws PolicyValidationError on a relative `dir` or a `defaultLocale` outside `locales`.
     */
    constructor(config: PolicyConfig) {
        if (!path.isAbsolute(config.dir)) {
            throw new PolicyValidationError(
                `Policy "${config.slug}": dir must be an absolute path, got "${config.dir}" - ` +
                    `consumers run from several working directories, so a relative path would ` +
                    `silently point at different content per cwd.`,
                { slug: config.slug },
            );
        }
        const defaultLocale = config.defaultLocale ?? "en";
        if (!config.locales.includes(defaultLocale)) {
            throw new PolicyValidationError(
                `Policy "${config.slug}": defaultLocale "${defaultLocale}" is not in locales ` +
                    `(${config.locales.join(", ")}).`,
                { slug: config.slug },
            );
        }
        this.slug = config.slug;
        // Normalised so a trailing separator in the config (harmless to the walk) can never
        // make the traversal guard's prefix check reject every valid file.
        this.dir = path.resolve(config.dir);
        this.locales = [...config.locales];
        this.defaultLocale = defaultLocale;
    }

    /**
     * Walks, parses, and validates the whole policy directory. The un-memoized core every
     * accessor goes through.
     *
     * @returns the loaded revisions, ascending.
     * @throws PolicyValidationError on any layout or frontmatter breach.
     */
    private load(): LoadedRevision[] {
        return loadPolicy({
            slug: this.slug,
            dir: this.dir,
            locales: this.locales,
            defaultLocale: this.defaultLocale,
            cache: this.cache,
        });
    }

    /**
     * All revisions, ascending by revision date (lexicographic on the zero-padded strings, which
     * is chronological). Loads and validates the whole directory.
     *
     * @returns every revision, oldest first.
     * @throws PolicyValidationError on any rule breach, naming the offending entry and field.
     */
    revisions(): readonly PolicyRevision[] {
        return this.load().map(toPublic);
    }

    /**
     * The newest revision by revision date - the top of the archive, and the live page's
     * fallback before any revision is effective (the quickstart's `effective(now) ?? latest()`).
     * Distinct from {@link Policy.effective}: during a notice window `latest()` is published
     * but not yet binding, so it is never what a consent gate compares against or what an
     * acceptance stamps.
     *
     * @returns the newest revision.
     * @throws PolicyValidationError when the directory is invalid (it always holds at least one
     *   revision when valid).
     */
    latest(): PolicyRevision {
        const revs = this.load();
        return toPublic(revs[revs.length - 1]);
    }

    /**
     * The revision that BINDS at `now`: the newest revision whose `effectiveFrom` is on or
     * before `now`'s UTC day. THIS is what consent gates compare against and what an acceptance
     * stamps - during a notice window a user accepts the text that binds, never the pending one.
     *
     * @param now - the instant to evaluate, reduced to its UTC calendar day.
     * @returns the binding revision, or `undefined` before the first `effectiveFrom`.
     * @throws PolicyValidationError when the directory is invalid.
     */
    effective(now: Date): PolicyRevision | undefined {
        const today = isoDay(now);
        const revs = this.load();
        for (let i = revs.length - 1; i >= 0; i--) {
            if (revs[i].effectiveFrom <= today) {
                return toPublic(revs[i]);
            }
        }
        return undefined;
    }

    /**
     * The published, not-yet-effective revision that WILL actually bind next at `now` - what
     * drives the "takes effect on {date}" banner. When several revisions are pending at once
     * (rare), the one taking effect soonest is returned, since that is what the banner
     * announces next; on an effectiveFrom tie the newest revision wins, matching
     * {@link Policy.effective}. A revision superseded before its effective day (a newer
     * revision with an effectiveFrom on or before its own - see the immediate law/security
     * scenario in the README) is NEVER returned: its text will never bind, and announcing it
     * would be misinformation.
     *
     * @param now - the instant to evaluate, reduced to its UTC calendar day.
     * @returns the next revision to take effect, or `undefined` when nothing is pending.
     * @throws PolicyValidationError when the directory is invalid.
     */
    pending(now: Date): PolicyRevision | undefined {
        const today = isoDay(now);
        const revs = this.load();
        const superseded = supersededFlags(revs);
        // Non-superseded revisions have strictly increasing effectiveFrom by construction, so
        // the first one past today is the soonest to bind.
        for (let i = 0; i < revs.length; i++) {
            if (!superseded[i] && revs[i].effectiveFrom > today) {
                return toPublic(revs[i]);
            }
        }
        return undefined;
    }

    /**
     * Looks up one revision by its exact date string. The input is UNTRUSTED (typically a route
     * param), so a miss returns `undefined` and never throws - the consumer 404s. The corpus
     * itself is still validated: a malformed directory throws regardless of the input.
     *
     * @param revision - the candidate revision string (e.g. `"2026-07-28"`).
     * @returns the revision, or `undefined` when no revision has exactly that date string.
     * @throws PolicyValidationError when the directory is invalid.
     */
    revision(revision: string): PolicyRevision | undefined {
        const rev = this.load().find((entry) => entry.revision === revision);
        return rev === undefined ? undefined : toPublic(rev);
    }

    /**
     * The MDX body and optional title of one `(revision, locale)` pair, or `undefined` when
     * either does not exist. Absence is an ANSWER, not an error: a locale missing from an old
     * revision is legal (see the contiguity rule - locales introduced later never backfill the
     * archive), so the consumer decides whether `undefined` is a 404 or a fallback. The title is
     * the requested locale file's own `title:` only - no default-locale fallback (a display
     * title in the wrong language is the consumer's call to make, via
     * {@link Policy.revision}'s `title`).
     *
     * @param revision - the revision date string (untrusted).
     * @param locale - the locale code (untrusted).
     * @returns the content, or `undefined` when the revision or the locale file is absent.
     * @throws PolicyValidationError when the directory is invalid.
     */
    content(revision: string, locale: string): PolicyContent | undefined {
        const rev = this.load().find((entry) => entry.revision === revision);
        const file = rev?.files.get(locale);
        if (file === undefined) {
            return undefined;
        }
        return { source: file.source, title: file.title };
    }

    /**
     * Walks and validates everything - the layout grammar, every file's frontmatter, locale
     * contiguity - and throws the first violation, its message naming the file path and field.
     * The red/green drill target for consumer test suites and CI: one green `assertValid()` per
     * policy proves the next deploy cannot fail on policy content.
     *
     * @throws PolicyValidationError on the first rule breach.
     */
    assertValid(): void {
        this.load();
    }
}

/**
 * Every revision across `policies` that owes user-facing notice (`notice !== "none"`), will
 * actually bind (or already did), and whose `effectiveFrom` is within `horizonDays` (default
 * 60) before `now` or still in the future. Ordered by policy, then revision ascending. A
 * revision superseded before its effective day (a newer revision took effect on or before its
 * effectiveFrom) is never queued - notice about a text that will never bind is misinformation.
 *
 * THE HORIZON IS LOAD-BEARING, not an optimization: consumers dedupe notice delivery on rows
 * that a TTL eventually sweeps (SwiftGuard: 90 days). An unbounded queue would re-notify every
 * user about every historical revision each time its dedupe row expired, so the horizon must
 * stay comfortably INSIDE the consumer's dedupe TTL - old revisions age out of the queue before
 * their dedupe rows do.
 *
 * @param policies - the policies to scan.
 * @param options - `now` (reduced to its UTC day) and the optional `horizonDays` (default 60,
 *   must be a finite, non-negative number - a negative horizon would silently drop owed
 *   notices, so it throws instead).
 * @returns each owed `{ policy, revision }` pair.
 * @throws PolicyValidationError when any policy's directory is invalid.
 * @throws TypeError on a non-finite or negative `horizonDays`.
 */
export function noticeQueue(
    policies: readonly Policy[],
    options: { now: Date; horizonDays?: number },
): readonly { policy: Policy; revision: PolicyRevision }[] {
    const horizonDays = options.horizonDays ?? 60;
    if (!Number.isFinite(horizonDays) || horizonDays < 0) {
        throw new TypeError(
            `noticeQueue: horizonDays must be a finite, non-negative number, got ${horizonDays}.`,
        );
    }
    const cutoff = isoDay(new Date(options.now.getTime() - horizonDays * 86_400_000));
    const queue: { policy: Policy; revision: PolicyRevision }[] = [];
    for (const policy of policies) {
        const revisions = policy.revisions();
        const superseded = supersededFlags(revisions);
        revisions.forEach((revision, index) => {
            if (!superseded[index] && revision.notice !== "none" && revision.effectiveFrom >= cutoff) {
                queue.push({ policy, revision });
            }
        });
    }
    return queue;
}

/**
 * The one pending revision a user-facing banner should announce at `now`, across `policies`: the
 * soonest-to-take-effect revision that is published, not yet effective, still going to bind, and
 * OWES notice (`notice !== "none"`). This is what `<PolicyBanner>` renders from, and what an
 * in-app banner endpoint should serve.
 *
 * Deliberately NOT `policies.map((p) => p.pending(now))`: `pending()` answers "what takes effect
 * next" for one policy regardless of tier, so it happily returns a `notice: "none"` revision -
 * announcing which contradicts the recorded legal judgement that no notice is owed - and it would
 * then MASK a later notice-owing revision behind it. This function skips `"none"` revisions and
 * keeps scanning, so the banner announces the next revision users are actually owed word of.
 *
 * @param policies - the policies to scan (pass all of them; a banner is site-wide).
 * @param now - the instant to evaluate, reduced to its UTC calendar day - a revision stops being
 *   announced at UTC midnight of its `effectiveFrom`, the same boundary `effective()` uses.
 * @returns the `{ policy, revision }` to announce - on an `effectiveFrom` tie the first policy in
 *   the given order wins - or `undefined` when nothing pending owes notice.
 * @throws PolicyValidationError when any policy's directory is invalid.
 */
export function pendingNotice(
    policies: readonly Policy[],
    now: Date,
): { policy: Policy; revision: PolicyRevision } | undefined {
    const today = isoDay(now);
    let soonest: { policy: Policy; revision: PolicyRevision } | undefined;
    for (const policy of policies) {
        const revisions = policy.revisions();
        const superseded = supersededFlags(revisions);
        for (let i = 0; i < revisions.length; i++) {
            const revision = revisions[i];
            if (superseded[i] || revision.notice === "none" || revision.effectiveFrom <= today) {
                continue;
            }
            // Non-superseded revisions have strictly increasing effectiveFrom, so this first
            // match is this policy's soonest - take it and stop scanning the policy either way.
            if (soonest === undefined || revision.effectiveFrom < soonest.revision.effectiveFrom) {
                soonest = { policy, revision };
            }
            break;
        }
    }
    return soonest;
}

/**
 * The revision string a user must have accepted at `now` to count as consented, across the
 * given policies (a consumer typically passes `[terms, privacy]` - consent binds them jointly):
 * the MAX effective revision that is either a policy's BASELINE (the first revision that ever
 * binds - what everyone accepted at signup) or carries `notice: "reconsent"`. A `"notify"`-tier
 * revision deliberately does NOT move this - notify means existing consent stands, so it must
 * never re-prompt anyone. Compare a stored acceptance with lexicographic `>=` against this
 * string.
 *
 * A revision superseded before its effective day never moves the gate, for the same reason
 * `pending()` and `noticeQueue` exclude it: its text never binds, so demanding consent to it is
 * meaningless - and would re-prompt every user on its effectiveFrom day over nothing. When a
 * superseding revision still owes the superseded one's reconsent, the AUTHOR records
 * `reconsent` on the superseding revision (see the skill's supersession step).
 *
 * STAMP THIS VALUE at acceptance time (the README recipe does): it is monotone over time and
 * never runs ahead of a requirement that has not bound yet. Stamping anything else re-creates
 * one of two failure modes - a single policy's revision lags the joint gate (re-prompt loop),
 * and the max EFFECTIVE revision across policies can exceed a sibling policy's pending
 * reconsent revision string, silently satisfying the gate when that reconsent later binds.
 *
 * Cross-policy nuance, deliberate: the gate is ONE joint threshold, so a reconsent whose
 * revision string is older than a sibling policy's newer baseline/reconsent is subsumed by it -
 * users re-prompt once against the joint max, not once per policy. Consumers needing strictly
 * per-policy reconsent tracking run this per policy with one stored stamp each.
 *
 * @param policies - the policies consent binds jointly.
 * @param now - the instant to evaluate (a not-yet-effective reconsent revision does not count
 *   until its `effectiveFrom` day).
 * @returns the required revision string, or `""` when nothing is effective yet (an empty string
 *   compares `<=` everything, correctly meaning "no consent is required yet").
 * @throws PolicyValidationError when any policy's directory is invalid.
 */
export function requiredConsentRevision(policies: readonly Policy[], now: Date): string {
    const today = isoDay(now);
    let required = "";
    for (const policy of policies) {
        const revisions = policy.revisions();
        const superseded = supersededFlags(revisions);
        // The baseline is the first revision that ever BINDS: the first non-superseded one
        // (always found - the newest revision is never superseded), which also carries the
        // minimum effectiveFrom that ever binds, so it is the signup baseline from day one.
        const baseline = superseded.indexOf(false);
        for (let i = 0; i < revisions.length; i++) {
            const rev = revisions[i];
            if (superseded[i] || rev.effectiveFrom > today) {
                continue;
            }
            if ((i === baseline || rev.notice === "reconsent") && rev.revision > required) {
                required = rev.revision;
            }
        }
    }
    return required;
}

/**
 * Validates every policy (each one's `assertValid()`) and rejects duplicate slugs across the
 * set - two policies sharing a slug would make acceptance records ambiguous. The one call a
 * consumer's CI needs.
 *
 * @param policies - the full set of configured policies.
 * @throws PolicyValidationError on a duplicate slug or any single policy's first violation.
 */
export function assertValidAll(policies: readonly Policy[]): void {
    const seen = new Set<string>();
    for (const policy of policies) {
        if (seen.has(policy.slug)) {
            throw new PolicyValidationError(
                `Duplicate policy slug "${policy.slug}" - every policy must have a unique slug.`,
                { slug: policy.slug },
            );
        }
        seen.add(policy.slug);
        policy.assertValid();
    }
}
