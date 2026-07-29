/**
 * Public types of the policy domain. Framework-free and fs-free: these shapes are shared by the
 * core entry, the React entry, and consumers' own consent/notice code.
 */

/**
 * The recorded human judgement about one revision's notice obligation - a legal decision, not a
 * computed value (see `rules/policies.md` for the decision table):
 *
 * - `"none"` - non-material, or a change forced by law/security that owes no notice.
 * - `"notify"` - users must be told, but existing consent stands; it never re-prompts anyone.
 * - `"reconsent"` - users must expressly accept again before the revision binds them.
 */
export type PolicyNotice = "none" | "notify" | "reconsent";

/**
 * Configuration for one {@link Policy | `Policy`} instance. Stored at construction; no filesystem
 * access happens until an accessor is called.
 */
export interface PolicyConfig {
    /** The policy's identifier, e.g. `"terms-of-service"`. Unique across a consumer's policies. */
    slug: string;
    /**
     * ABSOLUTE path to this policy's directory (the one holding `YYYY-MM-DD/` revision
     * directories). Absolute because consumers run the same instance from several working
     * directories (multiple apps, repo-root scripts) - a relative path would silently point at
     * different content per cwd, so the constructor rejects it.
     */
    dir: string;
    /**
     * The locales the consumer serves, from ITS locale source. Every on-disk locale file must
     * belong to this set; a translation the consumer cannot serve is a validation error, not
     * dead content.
     */
    locales: readonly string[];
    /**
     * The locale whose file carries each revision's frontmatter (and must exist for every
     * revision). Defaults to `"en"`; must be in `locales`.
     */
    defaultLocale?: string;
}

/**
 * One revision of a policy: the metadata read from the revision directory's default-locale file,
 * plus the identity that IS the directory name. All dates are zero-padded `YYYY-MM-DD` STRINGS,
 * never `Date` objects: consumers store accepted revisions as these strings and compare with
 * lexicographic `>=`, which is correct exactly because the strings stay zero-padded ISO end to
 * end.
 */
export interface PolicyRevision {
    /** The revision date - the directory name, exactly that string form (e.g. `"2026-07-28"`). */
    readonly revision: string;
    /**
     * The date this revision starts to bind (`YYYY-MM-DD`, `>= revision`). The gap between
     * `revision` and `effectiveFrom` is the notice window the publisher granted.
     */
    readonly effectiveFrom: string;
    /** The recorded notice obligation for this revision; see {@link PolicyNotice}. */
    readonly notice: PolicyNotice;
    /**
     * One plain-English sentence saying what changed and why the notice tier is right. INTERNAL
     * changelog and legal evidence - never rendered to users.
     */
    readonly changeSummary: string;
    /**
     * The locales this revision actually has on disk, in the configured `locales` order. May be
     * a subset: a locale introduced at a later revision is legally absent here (see the
     * contiguity rule).
     */
    readonly locales: readonly string[];
    /** The default-locale file's optional display title, if it set one. */
    readonly title?: string;
}

/**
 * The renderable content of one `(revision, locale)` pair, as returned by `Policy.content`.
 */
export interface PolicyContent {
    /** The raw MDX body (frontmatter stripped), ready for an MDX compiler. */
    source: string;
    /** The `title:` of that locale's own file, if it set one (no default-locale fallback). */
    title?: string;
}
