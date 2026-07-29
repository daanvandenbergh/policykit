import { Policy } from "../policy.js";
import type { PolicyNotice, PolicyRevision } from "../types.js";

/**
 * Compile-time assertions, validated by `npm run typecheck` (this file is excluded from the
 * vitest run glob and from the build). `@ts-expect-error` is allowed ONLY here, where it asserts
 * that an invalid construct is correctly rejected.
 */

declare const policy: Policy;
declare const revision: PolicyRevision;

// @ts-expect-error - "immediate" is not a notice tier
const badNotice: PolicyNotice = "immediate";
void badNotice;

// @ts-expect-error - dir is required
new Policy({ slug: "terms", locales: ["en"] });

// @ts-expect-error - revision fields are readonly
revision.revision = "2026-01-01";

// @ts-expect-error - revisions() is a readonly array
policy.revisions().push(revision);

// @ts-expect-error - a revision's locales are readonly
revision.locales.push("fr");
