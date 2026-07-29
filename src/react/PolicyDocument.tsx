import type { JSX } from "react";
import { MDXRemote, type MDXRemoteProps } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import type { Policy } from "../policy/policy.js";

/**
 * Props for {@link PolicyDocument}.
 */
export interface PolicyDocumentProps {
    /** The configured `Policy` instance to render from. */
    policy: Policy;
    /** The locale to render. Must exist for the resolved revision - guard with `policy.content`. */
    locale: string;
    /**
     * The revision to render (`"YYYY-MM-DD"`). Omit for the live-page default:
     * `policy.effective(now) ?? policy.latest()` - the binding text when one binds, the newest
     * published text before any revision is effective.
     */
    revision?: string;
    /**
     * The MDX component map, forwarded to `MDXRemote` - supply your own link component etc.
     * here; policykit never imports `next/link` itself.
     */
    components?: MDXRemoteProps["components"];
}

/**
 * Async server component rendering one policy revision's MDX body via `next-mdx-remote/rsc`.
 * Deliberately THIN: it renders ONLY the body - no title, no "last updated" label, no prose
 * styling, no CSS - the consumer wraps it in its own page shell (titles come from
 * `policy.revision(...)?.title` / `policy.content(...)?.title`).
 *
 * `remark-gfm` is always on: legal documents carry pipe tables (a DPA's subprocessor list), and
 * without GFM a pipe table does not fail loudly - it silently renders as a paragraph of literal
 * `|` characters. That is content corruption in a legal document, so GFM is not an option.
 *
 * Throws when the resolved `(revision, locale)` pair has no content (an unknown revision, or a
 * locale legally absent from an old revision): for archive routes, check
 * `policy.revision(param)` / `policy.content(param, locale)` first and 404 on `undefined`
 * before rendering this component. The throw is deliberately a plain `Error`, not
 * `PolicyValidationError`: the corpus is valid - the ASK was wrong - and the guard-first
 * recipe above is the supported path; the throw is only the loud backstop for a missed guard.
 *
 * Accepted edge: the revision pick and the content read are TWO directory walks (the loader
 * never memoizes the walk, by design), so an edit landing between them - realistically only in
 * `next dev` or on a mutable deploy volume - can transiently hit the backstop throw for one
 * render. Production content that is immutable per deploy cannot tear.
 *
 * @param props - see {@link PolicyDocumentProps}.
 * @returns the rendered MDX body.
 */
export async function PolicyDocument(props: PolicyDocumentProps): Promise<JSX.Element> {
    const { policy, locale, revision, components } = props;
    const target = revision ?? (policy.effective(new Date()) ?? policy.latest()).revision;
    const content = policy.content(target, locale);
    if (content === undefined) {
        throw new Error(
            `Policy "${policy.slug}" has no content for revision "${target}" in locale ` +
                `"${locale}" - guard with policy.revision()/policy.content() and 404 on ` +
                `undefined before rendering PolicyDocument.`,
        );
    }
    return (
        <MDXRemote
            source={content.source}
            components={components}
            options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
        />
    );
}
