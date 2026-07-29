/**
 * The filesystem layer behind `Policy`: it walks a policy directory, enforces the layout grammar
 * and every frontmatter rule, and parses each MDX file - memoizing per file until the file
 * changes on disk. Internal: not exported from the package entry. The cache internals and the
 * traversal guard follow scribekit's `ContentStore` (the family's proven shape) without depending
 * on it - its store is not public API and its walk hardcodes the blog layout.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { PolicyValidationError } from "./errors.js";
import type { PolicyNotice } from "./types.js";

/** The shape of a revision directory name / effectiveFrom value: a zero-padded ISO date. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A locale content file inside a revision directory, capturing the locale code. */
const LOCALE_FILE = /^([a-z]{2}(?:-[A-Z]{2})?)\.mdx$/;

/** The allowed `notice:` values - see `PolicyNotice` for what each tier means. */
const NOTICES: readonly PolicyNotice[] = ["none", "notify", "reconsent"];

/** Frontmatter keys allowed in a revision's default-locale file. */
const DEFAULT_LOCALE_KEYS = ["effectiveFrom", "notice", "changeSummary", "title"];

/** Frontmatter keys allowed in a non-default locale file - metadata lives in ONE file only. */
const OTHER_LOCALE_KEYS = ["title"];

/**
 * Whether `value` is a zero-padded, CALENDAR-VALID UTC day. The shape regex alone is not
 * enough for a legal package: `2026-02-30` matches it, sorts lexicographically like a real
 * date, and would enter the evidence chain as a day that does not exist - so every revision
 * date and effectiveFrom must also round-trip through a real UTC date.
 *
 * @param value - the candidate `YYYY-MM-DD` string.
 * @returns true when the string is a real calendar day.
 */
function isCalendarDay(value: string): boolean {
    if (!ISO_DAY.test(value)) {
        return false;
    }
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * One parsed policy MDX file: the body plus its validated frontmatter. The metadata fields are
 * set only for a revision's default-locale file (the one place metadata lives).
 */
export interface ParsedPolicyFile {
    /** The raw MDX body, frontmatter stripped. */
    source: string;
    /** The file's own optional display title. */
    title?: string;
    /** The revision's effective date, normalised to `YYYY-MM-DD`. Default-locale files only. */
    effectiveFrom?: string;
    /** The revision's notice tier. Default-locale files only. */
    notice?: PolicyNotice;
    /** The revision's internal changelog sentence. Default-locale files only. */
    changeSummary?: string;
}

/**
 * One cached parse, with the file stats it was built from. `mtimeMs` catches the ordinary
 * edit; `size` catches a rewrite too fast for the filesystem's timestamp granularity to
 * notice, whenever the length changed (a same-size, same-timestamp rewrite is the inherent
 * blind spot of stat-based caching - the tradeoff every build tool makes).
 */
export interface CacheEntry {
    /** The file's `mtimeMs` at the time it was parsed. */
    mtimeMs: number;
    /** The file's byte size at the time it was parsed. */
    size: number;
    /** The validated parse result. */
    value: ParsedPolicyFile;
}

/**
 * One fully loaded and validated revision, including the per-locale parsed files `content()`
 * serves from. Internal counterpart of the public `PolicyRevision`.
 */
export interface LoadedRevision {
    /** The revision date string - the directory name. */
    revision: string;
    /** The validated effective date (`>= revision`). */
    effectiveFrom: string;
    /** The validated notice tier. */
    notice: PolicyNotice;
    /** The validated, non-empty change summary. */
    changeSummary: string;
    /** The default-locale file's optional title. */
    title?: string;
    /** Parsed file per present locale, keyed in the configured `locales` order. */
    files: ReadonlyMap<string, ParsedPolicyFile>;
}

/** What {@link loadPolicy} needs: the `Policy`'s resolved config plus its per-instance cache. */
export interface LoadInput {
    /** The policy's slug, for error messages. */
    slug: string;
    /** The absolute, normalised policy directory (no trailing separator). */
    dir: string;
    /** The configured locales. */
    locales: readonly string[];
    /** The resolved default locale (already known to be in `locales`). */
    defaultLocale: string;
    /**
     * The per-`Policy`-instance parse cache, keyed by absolute path. Per-instance rather than
     * module-global: two differently-configured instances may point at the same directory, and
     * what a file parses to depends on whether it is the instance's default locale.
     */
    cache: Map<string, CacheEntry>;
}

/**
 * Resolves a policy-relative file path to an absolute path confined to the policy directory.
 * The single path-traversal guard: every read funnels through it, so no crafted name can ever
 * resolve a file outside `dir` (the walk only feeds it `readdir` results today, but the guard
 * makes that safety structural rather than an assumption about callers). Requires `dir` to be
 * normalised (no trailing separator) - the `Policy` constructor guarantees that.
 *
 * @param dir - the absolute, normalised policy directory.
 * @param file - the file path relative to `dir`.
 * @returns the absolute path when it stays inside `dir`, else `undefined`.
 */
export function resolveWithin(dir: string, file: string): string | undefined {
    const abs = path.resolve(dir, file);
    if (abs !== dir && !abs.startsWith(dir + path.sep)) {
        return undefined;
    }
    return abs;
}

/**
 * Walks and validates one policy directory, returning its revisions sorted ascending (the
 * revision strings are zero-padded ISO dates, so the lexicographic sort IS chronological).
 *
 * Deliberately NOT memoized: the walk re-runs on every accessor call so `next dev` sees edits
 * live and every violation re-throws on every call (a build must fail loudly each time, never
 * once-then-cached). The corpus is tiny - a few policies times a few revisions times a few
 * locales - so re-walking is cheap; only the per-file parse is cached, keyed by
 * `(mtimeMs, size)`.
 *
 * Enforces the whole grammar and every frontmatter rule; any breach throws a
 * {@link PolicyValidationError} naming the offending entry and field:
 *
 * - every policy-root entry is a `YYYY-MM-DD/` revision directory naming a REAL calendar day,
 *   except `drafts/` which is skipped wholesale (the one sanctioned parking spot for work in
 *   progress);
 * - every file inside a revision directory is `<locale>.mdx` for a CONFIGURED locale, and its
 *   MDX body is non-empty (frontmatter alone is not a document);
 * - the default locale exists for every revision and carries the required frontmatter
 *   (`effectiveFrom` a real calendar day `>= revision`, `notice` in the allowed set,
 *   `changeSummary` non-empty); non-default files may carry only an optional `title`;
 * - locale contiguity: a non-default locale, once introduced at revision R, exists for every
 *   revision after R (it may be absent before R - a locale added later never demands backdated
 *   translations of the archive);
 * - the directory exists and holds at least one revision (a policy with nothing published is a
 *   misconfiguration, not an empty archive).
 *
 * @param input - the policy's config and cache; see {@link LoadInput}.
 * @returns the validated revisions, ascending.
 * @throws PolicyValidationError on the first rule breach.
 */
export function loadPolicy(input: LoadInput): LoadedRevision[] {
    const { slug, dir, locales, defaultLocale } = input;
    let rootEntries: fs.Dirent[];
    try {
        rootEntries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
            throw new PolicyValidationError(
                `Policy "${slug}": directory does not exist: ${dir}`,
                { slug },
            );
        }
        if (code === "ENOTDIR") {
            throw new PolicyValidationError(
                `Policy "${slug}": dir is not a directory: ${dir}`,
                { slug },
            );
        }
        throw error;
    }
    const revisionNames: string[] = [];
    for (const dirent of rootEntries) {
        if (dirent.name === "drafts" && dirent.isDirectory()) {
            continue;
        }
        if (!dirent.isDirectory() || !isCalendarDay(dirent.name)) {
            throw new PolicyValidationError(
                `Policy "${slug}": unexpected entry "${dirent.name}" in ${dir} - every entry ` +
                    `must be a revision directory named after a real YYYY-MM-DD calendar day ` +
                    `(or the ignored "drafts/").`,
                { slug, file: dirent.name },
            );
        }
        revisionNames.push(dirent.name);
    }
    if (revisionNames.length === 0) {
        throw new PolicyValidationError(
            `Policy "${slug}": no revisions found in ${dir} - a policy needs at least one ` +
                `YYYY-MM-DD revision directory.`,
            { slug },
        );
    }
    revisionNames.sort();

    const revisions: LoadedRevision[] = [];
    for (const revision of revisionNames) {
        revisions.push(loadRevision(input, revision));
    }

    // Locale contiguity: introduced at R means present for every revision >= R.
    for (const locale of locales) {
        if (locale === defaultLocale) {
            continue;
        }
        const first = revisions.findIndex((rev) => rev.files.has(locale));
        if (first === -1) {
            continue;
        }
        for (let i = first + 1; i < revisions.length; i++) {
            const rev = revisions[i];
            if (!rev.files.has(locale)) {
                throw new PolicyValidationError(
                    `Policy "${slug}": locale "${locale}" was introduced at revision ` +
                        `${revisions[first].revision} but is missing from revision ` +
                        `${rev.revision} - once introduced, a locale must exist for every ` +
                        `later revision.`,
                    { slug, file: `${rev.revision}/${locale}.mdx` },
                );
            }
        }
    }
    return revisions;
}

/**
 * Loads and validates one revision directory: checks every filename against the locale grammar
 * and the configured locales, requires the default-locale file, parses each file (through the
 * cache), and checks `effectiveFrom >= revision`.
 *
 * @param input - the policy's config and cache.
 * @param revision - the revision directory name (already grammar-checked).
 * @returns the loaded revision.
 * @throws PolicyValidationError on any breach, naming the file.
 */
function loadRevision(input: LoadInput, revision: string): LoadedRevision {
    const { slug, dir, locales, defaultLocale } = input;
    const present = new Map<string, string>();
    for (const dirent of fs.readdirSync(path.join(dir, revision), { withFileTypes: true })) {
        const rel = `${revision}/${dirent.name}`;
        const match = dirent.isFile() ? LOCALE_FILE.exec(dirent.name) : null;
        if (!match) {
            throw new PolicyValidationError(
                `Policy "${slug}": unexpected entry "${rel}" - a revision directory may only ` +
                    `contain <locale>.mdx files (e.g. "en.mdx", "nl-NL.mdx").`,
                { slug, file: rel },
            );
        }
        const locale = match[1];
        if (!locales.includes(locale)) {
            throw new PolicyValidationError(
                `Policy "${slug}": "${rel}" is for locale "${locale}", which is not in the ` +
                    `configured locales (${locales.join(", ")}) - a translation the consumer ` +
                    `cannot serve is a misconfiguration, not dead content.`,
                { slug, file: rel },
            );
        }
        present.set(locale, dirent.name);
    }
    const defaultFile = present.get(defaultLocale);
    if (defaultFile === undefined) {
        throw new PolicyValidationError(
            `Policy "${slug}": revision ${revision} is missing its default-locale file ` +
                `"${revision}/${defaultLocale}.mdx" - the default locale carries the ` +
                `revision's frontmatter and must exist for every revision.`,
            { slug, file: `${revision}/${defaultLocale}.mdx` },
        );
    }

    const files = new Map<string, ParsedPolicyFile>();
    for (const locale of locales) {
        const name = present.get(locale);
        if (name !== undefined) {
            files.set(locale, readParsed(input, `${revision}/${name}`, locale === defaultLocale));
        }
    }
    // Runtime narrow instead of a cast: validateFrontmatter guarantees these fields whenever
    // isDefault was true, but that guarantee lives a function away - the narrow keeps the type
    // system honest across refactors instead of asserting over it.
    const meta = files.get(defaultLocale);
    if (
        meta?.effectiveFrom === undefined ||
        meta.notice === undefined ||
        meta.changeSummary === undefined
    ) {
        throw new PolicyValidationError(
            `Policy "${slug}": "${revision}/${defaultFile}" lost its revision metadata after ` +
                `parsing - this is a policykit internal error, please report it.`,
            { slug, file: `${revision}/${defaultFile}` },
        );
    }
    if (meta.effectiveFrom < revision) {
        throw new PolicyValidationError(
            `Policy "${slug}": "${revision}/${defaultFile}" has effectiveFrom ` +
                `${meta.effectiveFrom}, which is before its revision date ${revision} - a ` +
                `revision cannot take effect before it exists.`,
            { slug, file: `${revision}/${defaultFile}`, field: "effectiveFrom" },
        );
    }
    return {
        revision,
        effectiveFrom: meta.effectiveFrom,
        notice: meta.notice,
        changeSummary: meta.changeSummary,
        title: meta.title,
        files,
    };
}

/**
 * Reads, frontmatter-parses, and validates one file, serving the memoized value when the file's
 * `(mtimeMs, size)` is unchanged since it was cached. The cache is written only after validation
 * succeeds, so a failed parse caches nothing and the next call retries (and re-throws) rather
 * than replaying a half-built state. Syntactically invalid YAML is wrapped into a
 * {@link PolicyValidationError} naming the file - a stray colon in frontmatter is the single
 * most likely authoring mistake, and the error convention promises the file name.
 *
 * @param input - the policy's config and cache.
 * @param rel - the file path relative to the policy directory.
 * @param isDefault - whether this is the revision's default-locale file (widens the allowed
 *   frontmatter and requires the metadata fields).
 * @returns the validated parse.
 * @throws PolicyValidationError when the path escapes the policy directory or a frontmatter
 *   rule breaks.
 */
function readParsed(input: LoadInput, rel: string, isDefault: boolean): ParsedPolicyFile {
    const { slug, dir, cache } = input;
    const abs = resolveWithin(dir, rel);
    if (abs === undefined) {
        throw new PolicyValidationError(
            `Policy "${slug}": "${rel}" resolves outside the policy directory.`,
            { slug, file: rel },
        );
    }
    const stat = fs.statSync(abs);
    const hit = cache.get(abs);
    if (hit && hit.mtimeMs === stat.mtimeMs && hit.size === stat.size) {
        return hit.value;
    }
    let parsed: ReturnType<typeof matter>;
    try {
        // The empty options object is load-bearing: without it gray-matter serves repeated
        // content from a hidden module-level cache whose hit path drops the `.matter` raw-text
        // property that the effectiveFrom rollover check reads. Our own (mtimeMs, size) cache
        // makes gray-matter's redundant anyway.
        parsed = matter(fs.readFileSync(abs, "utf8"), {});
    } catch (error) {
        throw new PolicyValidationError(
            `Policy "${slug}": "${rel}" has invalid frontmatter YAML: ` +
                `${error instanceof Error ? error.message : String(error)}`,
            { slug, file: rel },
        );
    }
    const value = validateFrontmatter(slug, rel, parsed, isDefault);
    cache.set(abs, { mtimeMs: stat.mtimeMs, size: stat.size, value });
    return value;
}

/**
 * Validates one file's frontmatter against the contract: the default-locale file carries the
 * revision's required metadata (and may add `title`); every other file may carry ONLY an
 * optional `title` - metadata duplicated across locales is metadata that drifts. The MDX body
 * must be non-empty in every file: the body IS the legal text, so a file that is frontmatter
 * with no content (a botched merge, a forgotten paste) must fail loudly rather than validate
 * green and ship as an empty legal document. Hand-rolled
 * coercion rather than a schema library: repo-authored frontmatter is not an untrusted boundary,
 * and each check can name the file and field precisely.
 *
 * @param slug - the policy slug, for error messages.
 * @param rel - the file path relative to the policy directory, for error messages.
 * @param parsed - the `gray-matter` result (body, data, and the raw frontmatter text).
 * @param isDefault - whether this is the revision's default-locale file.
 * @returns the validated parse.
 * @throws PolicyValidationError naming the file and field on any breach.
 */
function validateFrontmatter(
    slug: string,
    rel: string,
    parsed: { content: string; data: unknown; matter: string },
    isDefault: boolean,
): ParsedPolicyFile {
    // The explicit annotation (not just the arrow's return type) is what lets control-flow
    // analysis treat each fail() call as terminal, so the checks below narrow without casts.
    const fail: (field: string, message: string) => never = (field, message) => {
        throw new PolicyValidationError(
            `Policy "${slug}": "${rel}" frontmatter field "${field}" ${message}`,
            { slug, file: rel, field },
        );
    };
    const { data } = parsed;
    // A prototype check, not just typeof-object: YAML resolves a bare `2026-07-07` scalar to a
    // Date (and `!!binary` to a Buffer) - objects with zero own keys that would otherwise read
    // as empty-but-valid frontmatter instead of failing as non-mapping. Arrays fail it too.
    if (
        typeof data !== "object" ||
        data === null ||
        Object.getPrototypeOf(data) !== Object.prototype
    ) {
        throw new PolicyValidationError(
            `Policy "${slug}": "${rel}" frontmatter must be a YAML mapping of key: value pairs.`,
            { slug, file: rel },
        );
    }
    if (parsed.content.trim() === "") {
        throw new PolicyValidationError(
            `Policy "${slug}": "${rel}" has an empty MDX body - the body IS the legal text, so ` +
                `a file with frontmatter but no content is a mistake, not a document.`,
            { slug, file: rel },
        );
    }
    const record = data as Record<string, unknown>;
    const allowed = isDefault ? DEFAULT_LOCALE_KEYS : OTHER_LOCALE_KEYS;
    for (const key of Object.keys(record)) {
        if (!allowed.includes(key)) {
            fail(key, `is not allowed here - allowed keys: ${allowed.join(", ")}.`);
        }
    }
    const file: ParsedPolicyFile = { source: parsed.content };
    const rawTitle = record["title"];
    if (rawTitle !== undefined) {
        if (typeof rawTitle !== "string" || rawTitle.trim() === "") {
            fail("title", "must be a non-empty string when present.");
        }
        file.title = rawTitle;
    }
    if (!isDefault) {
        return file;
    }
    const effectiveFrom = coerceIsoDate(record["effectiveFrom"], parsed.matter);
    if (effectiveFrom === undefined) {
        fail("effectiveFrom", "is required and must be a real YYYY-MM-DD calendar date.");
    }
    const rawNotice = record["notice"];
    const notice = NOTICES.find((tier) => tier === rawNotice);
    if (notice === undefined) {
        fail("notice", `is required and must be one of: ${NOTICES.join(", ")}.`);
    }
    const changeSummary = record["changeSummary"];
    if (typeof changeSummary !== "string" || changeSummary.trim() === "") {
        fail("changeSummary", "is required and must be a non-empty string.");
    }
    file.effectiveFrom = effectiveFrom;
    file.notice = notice;
    file.changeSummary = changeSummary;
    return file;
}

/**
 * Coerces a frontmatter value to a zero-padded, calendar-valid `YYYY-MM-DD` string, or
 * `undefined` when it is not a plain real date. Two shapes are accepted because YAML produces
 * both: a string (the value was quoted), and a `Date` at exactly UTC midnight (what an
 * unquoted `2026-08-12` parses to under the YAML timestamp rule). A `Date` carrying a time
 * component is rejected - the whole package is day-granular by design.
 *
 * The `Date` branch carries a rollover trap the object alone cannot reveal: YAML resolves a
 * calendar-invalid `2026-13-45` by ROLLING IT OVER to a real but different day (2027-02-14),
 * so the produced day is required to appear literally in the raw frontmatter text the author
 * wrote - a rolled-over date never does, and is rejected instead of silently binding a legal
 * document on a day nobody chose.
 *
 * @param value - the raw frontmatter value.
 * @param raw - the file's raw frontmatter text, for the rollover cross-check.
 * @returns the `YYYY-MM-DD` string, or `undefined` when invalid.
 */
function coerceIsoDate(value: unknown, raw: string): string | undefined {
    if (typeof value === "string") {
        return isCalendarDay(value) ? value : undefined;
    }
    if (value instanceof Date && value.getTime() % 86_400_000 === 0) {
        const day = value.toISOString().slice(0, 10);
        return raw.includes(day) ? day : undefined;
    }
    return undefined;
}
