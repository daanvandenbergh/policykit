import { describe, expect, it } from "vitest";
import { Policy, noticeQueue, requiredConsentRevision } from "../policy.js";
import { fixture } from "./helpers.js";

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

    it("excludes revisions whose effectiveFrom fell outside the default 60-day horizon", () => {
        expect(noticeQueue([terms, privacy], { now: new Date("2026-12-01T00:00:00Z") })).toEqual([]);
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
});
