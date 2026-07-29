import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { PolicyValidationError } from "./errors.js";
import type { PolicyNotice } from "./types.js";

/**
 * The filesystem layer behind `Policy`: it walks a policy directory, enforces the layout grammar
 * and every frontmatter rule, and parses each MDX file - memoizing per file until the file
 * changes on disk. Internal: not exported from the package entry. The cache internals and the
 * traversal guard follow scribekit's `ContentStore` (the family's proven shape) without depending
 * on it - its store is not public API and its walk hardcodes the blog layout.
 */

/** A revision directory name: the zero-padded ISO date that IS the revision's identity. */
const REVISION_DIR = /^\d{4}-\d{2}-\d{2}$/;

/** A locale content file inside a revision directory, capturing the locale code. */
const LOCALE_FILE = /^([a-z]{2}(?:-[A-Z]{2})?)\.mdx$/;

/** The allowed `notice:` values - see `PolicyNotice` for what each tier means. */
const NOTICES: readonly PolicyNotice[] = ["none", "notify", "reconsent"];

/** Frontmatter keys allowed in a revision's default-locale file. */
const DEFAULT_LOCALE_KEYS = ["effectiveFrom", "notice", "changeSummary", "title"];

/** Frontmatter keys allowed in a non-default locale file - metadata lives in ONE file only. */
const OTHER_LOCALE_KEYS = ["title"];

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
 * One cached parse, with the file stats it was built from. `mtimeMs` catches the ordinary edit;
 * `size` catches a rewrite too fast for the filesystem's timestamp granularity to notice.
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
    /** The absolute policy directory. */
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
 * makes that safety structural rather than an assumption about callers).
 *
 * @param dir - the absolute policy directory.
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
 * - every policy-root entry is a `YYYY-MM-DD/` revision directory, except `drafts/` which is
 *   skipped wholesale (the one sanctioned parking spot for work in progress);
 * - every file inside a revision directory is `<locale>.mdx` for a CONFIGURED locale;
 * - the default locale exists for every revision and carries the required frontmatter
 *   (`effectiveFrom` a date `>= revision`, `notice` in the allowed set, `changeSummary`
 *   non-empty); non-default files may carry only an optional `title`;
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
    const { slug, dir, locales, defaultLocale, cache } = input;
    if (!fs.existsSync(dir)) {
        throw new PolicyValidationError(
            `Policy "${slug}": directory does not exist: ${dir}`,
            { slug },
        );
    }
    const revisionNames: string[] = [];
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (dirent.name === "drafts" && dirent.isDirectory()) {
            continue;
        }
        if (!dirent.isDirectory() || !REVISION_DIR.test(dirent.name)) {
            throw new PolicyValidationError(
                `Policy "${slug}": unexpected entry "${dirent.name}" in ${dir} - every entry ` +
                    `must be a YYYY-MM-DD revision directory (or the ignored "drafts/").`,
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
    const { slug, dir, locales, defaultLocale, cache } = input;
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
    if (!present.has(defaultLocale)) {
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
    const meta = files.get(defaultLocale) as Required<Pick<ParsedPolicyFile, "effectiveFrom" | "notice" | "changeSummary">> & ParsedPolicyFile;
    if (meta.effectiveFrom < revision) {
        throw new PolicyValidationError(
            `Policy "${slug}": "${revision}/${present.get(defaultLocale)}" has effectiveFrom ` +
                `${meta.effectiveFrom}, which is before its revision date ${revision} - a ` +
                `revision cannot take effect before it exists.`,
            { slug, file: `${revision}/${present.get(defaultLocale)}`, field: "effectiveFrom" },
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
 * than replaying a half-built state.
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
    const { content, data } = matter(fs.readFileSync(abs, "utf8"));
    const value = validateFrontmatter(slug, rel, content, data as Record<string, unknown>, isDefault);
    cache.set(abs, { mtimeMs: stat.mtimeMs, size: stat.size, value });
    return value;
}

/**
 * Validates one file's frontmatter against the contract: the default-locale file carries the
 * revision's required metadata (and may add `title`); every other file may carry ONLY an
 * optional `title` - metadata duplicated across locales is metadata that drifts. Hand-rolled
 * coercion rather than a schema library: repo-authored frontmatter is not an untrusted boundary,
 * and each check can name the file and field precisely.
 *
 * @param slug - the policy slug, for error messages.
 * @param rel - the file path relative to the policy directory, for error messages.
 * @param content - the MDX body.
 * @param data - the raw frontmatter object from `gray-matter`.
 * @param isDefault - whether this is the revision's default-locale file.
 * @returns the validated parse.
 * @throws PolicyValidationError naming the file and field on any breach.
 */
function validateFrontmatter(
    slug: string,
    rel: string,
    content: string,
    data: Record<string, unknown>,
    isDefault: boolean,
): ParsedPolicyFile {
    const allowed = isDefault ? DEFAULT_LOCALE_KEYS : OTHER_LOCALE_KEYS;
    const fail = (field: string, message: string): never => {
        throw new PolicyValidationError(
            `Policy "${slug}": "${rel}" frontmatter field "${field}" ${message}`,
            { slug, file: rel, field },
        );
    };
    for (const key of Object.keys(data)) {
        if (!allowed.includes(key)) {
            fail(key, `is not allowed here - allowed keys: ${allowed.join(", ")}.`);
        }
    }
    const title = data["title"];
    if (title !== undefined && (typeof title !== "string" || title.trim() === "")) {
        fail("title", "must be a non-empty string when present.");
    }
    const file: ParsedPolicyFile = { source: content, title: title as string | undefined };
    if (!isDefault) {
        return file;
    }
    const effectiveFrom = coerceIsoDate(data["effectiveFrom"]);
    if (effectiveFrom === undefined) {
        fail("effectiveFrom", "is required and must be a YYYY-MM-DD date.");
    }
    const notice = data["notice"];
    if (typeof notice !== "string" || !(NOTICES as readonly string[]).includes(notice)) {
        fail("notice", `is required and must be one of: ${NOTICES.join(", ")}.`);
    }
    const changeSummary = data["changeSummary"];
    if (typeof changeSummary !== "string" || changeSummary.trim() === "") {
        fail("changeSummary", "is required and must be a non-empty string.");
    }
    file.effectiveFrom = effectiveFrom;
    file.notice = notice as PolicyNotice;
    file.changeSummary = changeSummary as string;
    return file;
}

/**
 * Coerces a frontmatter value to a zero-padded `YYYY-MM-DD` string, or `undefined` when it is
 * not a plain date. Two shapes are accepted because YAML produces both: a string that already
 * matches (the value was quoted), and a `Date` at exactly UTC midnight (what an unquoted
 * `2026-08-12` parses to under the YAML timestamp rule). A `Date` carrying a time component is
 * rejected - the whole package is day-granular by design.
 *
 * @param value - the raw frontmatter value.
 * @returns the `YYYY-MM-DD` string, or `undefined` when invalid.
 */
function coerceIsoDate(value: unknown): string | undefined {
    if (typeof value === "string" && REVISION_DIR.test(value)) {
        return value;
    }
    if (value instanceof Date && value.getTime() % 86_400_000 === 0) {
        return value.toISOString().slice(0, 10);
    }
    return undefined;
}
