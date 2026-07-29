/**
 * Public surface of the React subpath (`@daanvandenbergh/policykit/react`): the
 * `PolicyDocument` server component that renders one revision's MDX body, and the headless
 * `PolicyBanner` that announces the next revision to take effect. Kept separate from the root
 * entry so the core stays react-free - consumers' server-side packages import the root, only
 * their Next.js apps import this subpath.
 */

export { PolicyDocument, type PolicyDocumentProps } from "./PolicyDocument.js";
export { PolicyBanner, type PolicyBannerProps } from "./PolicyBanner.js";
