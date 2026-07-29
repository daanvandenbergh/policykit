import { describe, expect, it } from "vitest";
import { Policy, noticeQueue, requiredConsentRevision } from "../policy.js";
import { fixture, makePolicyDir, mdx } from "./helpers.js";

/**
 * The cross-policy functions over the fixtures. Terms: 2026-07-07 (none, effective 2026-07-07)
 * and 2026-07-28 (notify, effective 2026-08-12). Privacy: 2026-07-14 (none, effective
 * 2026-07-14) and 2026-08-01 (reconsent, effective 2026-09-01).
 */

const terms = new Policy({ slug: "terms-of-service", dir: fixture("terms"), locales: ["en", "nl"] });
const privacy = new Policy({ slug: "privacy", dir: fixture("privacy"), locales: ["en", "nl"] });

describe("noticeQueue", () => {
    it("queues recent-past and future notice-owing revisions; never notice none", () => {
        const queue = noticeQueue([terms, privacy], { now: new Date("2026-08-20T12:00:00Z") });
        expect(queue.map((item) => [item.policy.slug, item.revision.revision])).toEqual([
            ["terms-of-service", "2026-07-28"],
            ["privacy", "2026-08-01"],
        ]);
    });

    it("never queues a superseded revision - its text will never bind", () => {
        const dir = makePolicyDir({
            "2026-07-01/en.mdx": mdx({ effectiveFrom: "2026-09-01", notice: "notify", changeSummary: "Pending change." }),
            "2026-07-02/en.mdx": mdx({ effectiveFrom: "2026-07-02", notice: "none", changeSummary: "Immediate security change." }),
        });
        const policy = new Policy({ slug: "superseded", dir, locales: ["en"] });
        expect(noticeQueue([policy], { now: new Date("2026-07-15T00:00:00Z") })).toEqual([]);
    });

    it("rejects a non-finite or negative horizonDays instead of silently dropping notices", () => {
        const now = new Date("2026-08-20T00:00:00Z");
        expect(() => noticeQueue([terms], { now, horizonDays: -30 })).toThrow(TypeError);
        expect(() => noticeQueue([terms], { now, horizonDays: Infinity })).toThrow(TypeError);
    });

    it("excludes revisions whose effectiveFrom fell outside the default 60-day horizon", () => {
        expect(noticeQueue([terms, privacy], { now: new Date("2026-12-01T00:00:00Z") })).toEqual([]);
    });

    it("queues multiple owed revisions from ONE policy, revision-ascending", () => {
        const dir = makePolicyDir({
            "2026-07-01/en.mdx": mdx({ effectiveFrom: "2026-07-01", notice: "notify", changeSummary: "First." }),
            "2026-07-10/en.mdx": mdx({ effectiveFrom: "2026-07-10", notice: "notify", changeSummary: "Second." }),
        });
        const policy = new Policy({ slug: "multi", dir, locales: ["en"] });
        const queue = noticeQueue([policy], { now: new Date("2026-07-15T00:00:00Z") });
        expect(queue.map((item) => item.revision.revision)).toEqual(["2026-07-01", "2026-07-10"]);
    });

    it("keeps a revision exactly at the horizon boundary and honours a custom horizonDays", () => {
        // 60 days after 2026-08-12 is 2026-10-11: still included that day, gone the next.
        expect(noticeQueue([terms], { now: new Date("2026-10-11T00:00:00Z") })).toHaveLength(1);
        expect(noticeQueue([terms], { now: new Date("2026-10-12T00:00:00Z") })).toHaveLength(0);
        expect(noticeQueue([terms, privacy], { now: new Date("2026-12-01T00:00:00Z"), horizonDays: 365 })).toHaveLength(2);
    });
});

describe("requiredConsentRevision", () => {
    it("starts at the first revision once it is effective", () => {
        expect(requiredConsentRevision([terms], new Date("2026-07-20T00:00:00Z"))).toBe("2026-07-07");
    });

    it('a "notify" revision never moves it - notify must never re-prompt anyone', () => {
        expect(requiredConsentRevision([terms], new Date("2026-09-01T00:00:00Z"))).toBe("2026-07-07");
    });

    it('a "reconsent" revision moves it, but only from its effectiveFrom day', () => {
        expect(requiredConsentRevision([privacy], new Date("2026-08-31T23:59:59Z"))).toBe("2026-07-14");
        expect(requiredConsentRevision([privacy], new Date("2026-09-01T00:00:00Z"))).toBe("2026-08-01");
    });

    it("takes the max across policies - consent binds them jointly", () => {
        expect(requiredConsentRevision([terms, privacy], new Date("2026-09-10T00:00:00Z"))).toBe("2026-08-01");
    });

    it('returns "" before anything is effective - no consent is required yet', () => {
        expect(requiredConsentRevision([terms, privacy], new Date("2026-01-01T00:00:00Z"))).toBe("");
    });

    it("ignores a superseded reconsent revision - consent to a never-binding text is meaningless", () => {
        // A reconsent revision pending for 2026-10-01 is superseded by a notify revision that
        // takes effect 2026-09-01: its text never binds, so its effectiveFrom day passing must
        // not move the gate (which would re-prompt every user over a text nobody is bound by).
        const dir = makePolicyDir({
            "2026-07-01/en.mdx": mdx({ effectiveFrom: "2026-07-01", notice: "none", changeSummary: "Baseline." }),
            "2026-08-01/en.mdx": mdx({ effectiveFrom: "2026-10-01", notice: "reconsent", changeSummary: "Pending reconsent." }),
            "2026-08-15/en.mdx": mdx({ effectiveFrom: "2026-09-01", notice: "notify", changeSummary: "Immediate change superseding it." }),
        });
        const policy = new Policy({ slug: "superseded-reconsent", dir, locales: ["en"] });
        expect(requiredConsentRevision([policy], new Date("2026-10-02T00:00:00Z"))).toBe("2026-07-01");
    });

    it("uses the first revision that ever BINDS as the baseline when the first is superseded", () => {
        // The first revision never binds (an immediate second revision superseded it), so the
        // baseline everyone accepts at signup is the second revision - from the day it binds,
        // not from the superseded revision's later effectiveFrom.
        const dir = makePolicyDir({
            "2026-07-01/en.mdx": mdx({ effectiveFrom: "2026-09-01", notice: "none", changeSummary: "Never binds." }),
            "2026-07-02/en.mdx": mdx({ effectiveFrom: "2026-07-02", notice: "notify", changeSummary: "Immediate, supersedes the first." }),
        });
        const policy = new Policy({ slug: "superseded-baseline", dir, locales: ["en"] });
        expect(requiredConsentRevision([policy], new Date("2026-07-15T00:00:00Z"))).toBe("2026-07-02");
        expect(requiredConsentRevision([policy], new Date("2026-09-02T00:00:00Z"))).toBe("2026-07-02");
    });
});
