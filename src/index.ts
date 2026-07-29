/**
 * Package entry point (`@daanvandenbergh/policykit`). Exposes the react-free core - the `Policy`
 * class, the cross-policy consent/notice functions (`noticeQueue`, `requiredConsentRevision`,
 * `assertValidAll`), the public types, and `PolicyValidationError`. This entry's module graph
 * imports ONLY `node:fs`, `node:path`, and `gray-matter` - never react or next - because
 * consumers' server-side core packages import it under architecture rules that forbid react;
 * that promise is enforced by a test in `src/policy/tests/`. The React renderer lives in the
 * `@daanvandenbergh/policykit/react` subpath.
 */

export * from "./policy/errors.js";
export * from "./policy/types.js";
export * from "./policy/policy.js";
