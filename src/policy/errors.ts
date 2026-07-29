/**
 * Policy-domain error type. This file is fs-free (no `node:fs`, no `server-only`) so any consumer
 * layer - including React components - can import `PolicyValidationError` for an `instanceof`
 * check without pulling the Node-only loader into its import graph.
 */

/**
 * Structured location details for a {@link PolicyValidationError}, so a consumer can render or
 * log precisely which policy, file, and frontmatter field broke instead of string-parsing the
 * message.
 */
export interface PolicyValidationErrorDetails {
    /** The slug of the policy the violation belongs to. */
    slug: string;
    /**
     * The offending entry, relative to the policy's directory (e.g. `"2026-07-28/en.mdx"` or a
     * stray root entry like `"notes.txt"`). Absent when the violation is not tied to one entry
     * (a relative `dir`, a missing directory, a duplicate slug).
     */
    file?: string;
    /** The offending frontmatter field (e.g. `"effectiveFrom"`), when the violation is one. */
    field?: string;
}

/**
 * Thrown by every `Policy` accessor when the policy's content directory breaches the layout
 * grammar or a frontmatter rule, and by the `Policy` constructor for config errors (a relative
 * `dir`, a `defaultLocale` outside `locales`). The message always names the offending entry and
 * field; the same facts are carried structurally as {@link PolicyValidationErrorDetails} so
 * consumers can handle them without parsing prose.
 *
 * Deliberately thrown on EVERY accessor call (the directory walk is never memoized): a malformed
 * policy file must fail `next build` during page-data collection and fail `assertValid()` in CI,
 * loudly and repeatably - never once-then-silently-cached.
 */
export class PolicyValidationError extends Error {
    /** The slug of the policy the violation belongs to. */
    readonly slug: string;
    /** The offending entry, relative to the policy directory, when the violation is tied to one. */
    readonly file?: string;
    /** The offending frontmatter field, when the violation is one. */
    readonly field?: string;

    /**
     * @param message - the human-readable violation, naming the entry and field.
     * @param details - the same location facts, structured; see
     *   {@link PolicyValidationErrorDetails}.
     */
    constructor(message: string, details: PolicyValidationErrorDetails) {
        super(message);
        this.name = "PolicyValidationError";
        this.slug = details.slug;
        this.file = details.file;
        this.field = details.field;
    }
}
