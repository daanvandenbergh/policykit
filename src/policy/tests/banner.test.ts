import { describe, expect, it } from "vitest";
import { Policy, pendingNotice } from "../policy.js";
import { fixture, makePolicyDir, mdx } from "./helpers.js";

/**
 * `pendingNotice` over the fixtures. Terms: 2026-07-07 (none, effective 2026-07-07) and
 * 2026-07-28 (notify, effective 2026-08-12). Privacy: 2026-07-14 (none, effective 2026-07-14)
 * and 2026-08-01 (reconsent, effective 2026-09-01).
 */

const terms = new Policy({ slug: "terms-of-service", dir: fixture("terms"), locales: ["en", "nl"] });
const privacy = new Policy({ slug: "privacy", dir: fixture("privacy"), locales: ["en", "nl"] });

describe("pendingNotice", () => {
    it("announces the pending notice-owing revision during its notice window", () => {
        const announcement = pendingNotice([terms], new Date("2026-07-28T12:00:00Z"));
        expect(announcement?.policy.slug).toBe("terms-of-service");
        expect(announcement?.revision.revision).toBe("2026-07-28");
        expect(announcement?.revision.effectiveFrom).toBe("2026-08-12");
    });

    it("takes the revision effective SOONEST across policies", () => {
        // Terms takes effect 2026-08-12, privacy 2026-09-01 - both pending, terms is next.
        const announcement = pendingNotice([privacy, terms], new Date("2026-08-01T00:00:00Z"));
        expect(announcement?.policy.slug).toBe("terms-of-service");
        // Once terms has bound, privacy's reconsent is what is still coming.
        const next = pendingNotice([privacy, terms], new Date("2026-08-12T00:00:00Z"));
        expect(next?.policy.slug).toBe("privacy");
        expect(next?.revision.revision).toBe("2026-08-01");
    });

    it("stops announcing at UTC midnight of effectiveFrom, not server-local midnight", () => {
        expect(pendingNotice([terms], new Date("2026-08-11T23:59:59Z"))?.revision.revision).toBe("2026-07-28");
        // 2026-08-12 03:00 in UTC+9 is still 2026-08-11 in UTC: the revision is still pending.
        expect(pendingNotice([terms], new Date("2026-08-12T03:00:00+09:00"))?.revision.revision).toBe("2026-07-28");
        expect(pendingNotice([terms], new Date("2026-08-12T00:00:00Z"))).toBeUndefined();
    });

    it("is undefined when nothing is pending at all", () => {
        expect(pendingNotice([terms, privacy], new Date("2026-12-01T00:00:00Z"))).toBeUndefined();
        expect(pendingNotice([], new Date("2026-08-01T00:00:00Z"))).toBeUndefined();
    });

    it('never announces a pending "none" revision - no notice is owed for it', () => {
        const dir = makePolicyDir({
            "2026-07-01/en.mdx": mdx({ effectiveFrom: "2026-07-01", notice: "none", changeSummary: "Baseline." }),
            "2026-07-10/en.mdx": mdx({ effectiveFrom: "2026-08-01", notice: "none", changeSummary: "A typo-tier clarification." }),
        });
        const policy = new Policy({ slug: "quiet", dir, locales: ["en"] });
        expect(policy.pending(new Date("2026-07-15T00:00:00Z"))?.revision).toBe("2026-07-10");
        expect(pendingNotice([policy], new Date("2026-07-15T00:00:00Z"))).toBeUndefined();
    });

    it('a pending "none" revision does not MASK a later notice-owing one', () => {
        // The bug a consumer writes with pending() + a notice filter: pending() returns the
        // soonest revision (the "none" one), which the filter then drops - silently swallowing
        // the reconsent that users must be warned about.
        const dir = makePolicyDir({
            "2026-07-01/en.mdx": mdx({ effectiveFrom: "2026-07-01", notice: "none", changeSummary: "Baseline." }),
            "2026-07-10/en.mdx": mdx({ effectiveFrom: "2026-08-01", notice: "none", changeSummary: "Quiet fix." }),
            "2026-07-20/en.mdx": mdx({ effectiveFrom: "2026-09-01", notice: "reconsent", changeSummary: "New processing." }),
        });
        const policy = new Policy({ slug: "masked", dir, locales: ["en"] });
        expect(policy.pending(new Date("2026-07-25T00:00:00Z"))?.revision).toBe("2026-07-10");
        expect(pendingNotice([policy], new Date("2026-07-25T00:00:00Z"))?.revision.revision).toBe("2026-07-20");
    });

    it("never announces a superseded revision - its text will never bind", () => {
        const dir = makePolicyDir({
            "2026-07-01/en.mdx": mdx({ effectiveFrom: "2026-09-01", notice: "notify", changeSummary: "Pending change." }),
            "2026-07-02/en.mdx": mdx({ effectiveFrom: "2026-07-02", notice: "none", changeSummary: "Immediate security change." }),
        });
        const policy = new Policy({ slug: "superseded", dir, locales: ["en"] });
        expect(pendingNotice([policy], new Date("2026-07-15T00:00:00Z"))).toBeUndefined();
    });

    it("on an effectiveFrom tie the first policy in the given order wins", () => {
        const make = (slug: string) =>
            new Policy({
                slug,
                dir: makePolicyDir({
                    "2026-07-01/en.mdx": mdx({ effectiveFrom: "2026-07-01", notice: "none", changeSummary: "Baseline." }),
                    "2026-07-10/en.mdx": mdx({ effectiveFrom: "2026-09-01", notice: "notify", changeSummary: "Change." }),
                }),
                locales: ["en"],
            });
        const [a, b] = [make("a"), make("b")];
        const now = new Date("2026-07-15T00:00:00Z");
        expect(pendingNotice([a, b], now)?.policy.slug).toBe("a");
        expect(pendingNotice([b, a], now)?.policy.slug).toBe("b");
    });

    it("throws on an invalid corpus rather than announcing nothing", () => {
        const dir = makePolicyDir({ "2026-13-01/en.mdx": mdx({ effectiveFrom: "2026-13-01", notice: "notify", changeSummary: "x" }) });
        const policy = new Policy({ slug: "broken", dir, locales: ["en"] });
        expect(() => pendingNotice([policy], new Date("2026-07-15T00:00:00Z"))).toThrow(/2026-13-01/);
    });
});
