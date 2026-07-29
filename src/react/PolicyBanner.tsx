import type { ReactNode } from "react";
import { pendingNotice, type Policy } from "../policy/policy.js";
import type { PolicyRevision } from "../policy/types.js";

/**
 * Props for {@link PolicyBanner}.
 */
export interface PolicyBannerProps {
    /** The policies to announce across - pass all of them; a banner is site-wide. */
    policies: readonly Policy[];
    /** The instant to evaluate, reduced to its UTC day. Defaults to `new Date()`. */
    now?: Date;
    /**
     * Renders the announcement. Called ONLY when there is something to announce, so it never
     * has to handle an empty case; the copy, the date formatting, and the markup are yours.
     */
    children: (announcement: { policy: Policy; revision: PolicyRevision }) => ReactNode;
}

/**
 * Server component announcing the next policy revision that takes effect - it resolves
 * {@link pendingNotice} and hands the result to `children`, or renders `null` when nothing
 * pending owes notice.
 *
 * Deliberately HEADLESS, for the same reason `PolicyDocument` is thin: policykit ships no CSS
 * and no user-facing copy, and "a new version takes effect on {date}" is a localized, formatted
 * sentence only the consumer can write. The component owns the QUESTION (which revision, and is
 * one owed at all - a `notice: "none"` revision is never announced, and never masks a later
 * notice-owing one); you own the answer's presentation.
 *
 * It reads the filesystem (like every `Policy` accessor), so it is server-only - render it in a
 * layout or page, not inside a `"use client"` tree.
 *
 * @param props - see {@link PolicyBannerProps}.
 * @returns the rendered announcement, or `null` when nothing pending owes notice.
 * @throws PolicyValidationError when any policy's directory is invalid.
 */
export function PolicyBanner(props: PolicyBannerProps): ReactNode {
    const announcement = pendingNotice(props.policies, props.now ?? new Date());
    return announcement === undefined ? null : props.children(announcement);
}
