import { describe, expect, it } from "vitest";
import { Policy } from "../policy.js";
import { fixture, makePolicyDir, mdx, validDefault } from "./helpers.js";

/**
 * Windowing semantics over the terms fixture (revision 2026-07-07 effective 2026-07-07;
 * revision 2026-07-28 effective 2026-08-12): `latest`, `effective`, `pending`, `revision`, and
 * `content`, including the UTC date-only boundary convention.
 */

const terms = new Policy({ slug: "terms-of-service", dir: fixture("terms"), locales: ["en", "nl"] });
const privacy = new Policy({ slug: "privacy", dir: fixture("privacy"), locales: ["en", "nl"] });

describe("latest", () => {
    it("returns the newest revision even while it is not yet effective", () => {
        expect(terms.latest().revision).toBe("2026-07-28");
    });
});

describe("effective", () => {
    it("is undefined before the first effectiveFrom", () => {
        expect(terms.effective(new Date("2026-07-06T23:59:59Z"))).toBeUndefined();
    });

    it("binds ON the effectiveFrom day itself (UTC, date-only)", () => {
        expect(terms.effective(new Date("2026-07-07T00:00:00Z"))?.revision).toBe("2026-07-07");
        expect(terms.effective(new Date("2026-08-12T00:00:00Z"))?.revision).toBe("2026-07-28");
    });

    it("keeps the old revision binding through the whole notice window", () => {
        expect(terms.effective(new Date("2026-08-11T23:59:59Z"))?.revision).toBe("2026-07-07");
    });

    it("reduces now to its UTC day - a local-time instant on the boundary does not bind early", () => {
        // 2026-08-12 03:00 in UTC+9 is still 2026-08-11 in UTC, so the new revision does not bind.
        expect(terms.effective(new Date("2026-08-12T03:00:00+09:00"))?.revision).toBe("2026-07-07");
    });
});

describe("pending", () => {
    it("returns the published-but-not-yet-effective revision during the notice window", () => {
        expect(terms.pending(new Date("2026-07-20T12:00:00Z"))?.revision).toBe("2026-07-28");
    });

    it("is undefined once everything is effective", () => {
        expect(terms.pending(new Date("2026-08-12T00:00:00Z"))).toBeUndefined();
    });

    it("returns the revision taking effect SOONEST when several are pending", () => {
        expect(terms.pending(new Date("2026-07-01T00:00:00Z"))?.revision).toBe("2026-07-07");
    });
});

describe("revision", () => {
    it("finds an exact revision string", () => {
        expect(terms.revision("2026-07-07")?.effectiveFrom).toBe("2026-07-07");
    });

    it("returns undefined (never throws) for garbage route params", () => {
        for (const garbage of ["nonsense", "2026-13-99", "../../etc/passwd", "", "2026-7-7"]) {
            expect(terms.revision(garbage)).toBeUndefined();
        }
    });
});

describe("content", () => {
    it("returns the MDX body and the locale file's own title", () => {
        const content = terms.content("2026-07-07", "nl");
        expect(content?.source).toContain("Overeenkomst");
        expect(content?.title).toBe("Servicevoorwaarden");
    });

    it("returns undefined for a locale legally absent from an old revision", () => {
        expect(privacy.content("2026-07-14", "nl")).toBeUndefined();
        expect(privacy.content("2026-08-01", "nl")?.source).toContain("spraakopnamen");
    });

    it("returns undefined for an unknown revision or locale", () => {
        expect(terms.content("2026-01-01", "en")).toBeUndefined();
        expect(terms.content("2026-07-07", "de")).toBeUndefined();
    });

    it("returns no title when the file sets none", () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault(),
            "2026-07-07/nl.mdx": mdx({}),
        });
        const policy = new Policy({ slug: "untitled", dir, locales: ["en", "nl"] });
        expect(policy.content("2026-07-07", "nl")?.title).toBeUndefined();
    });
});
