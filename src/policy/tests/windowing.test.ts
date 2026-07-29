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

describe("supersession", () => {
    it("an immediate newer revision permanently supersedes a still-pending older one", () => {
        // The README's sanctioned scenario: a law/security revision shipped effective
        // immediately while an earlier revision's notice window is still running. The
        // superseded text never binds, so pending() must never announce it.
        const dir = makePolicyDir({
            "2026-07-01/en.mdx": validDefault("2026-09-01"),
            "2026-07-02/en.mdx": validDefault("2026-07-02"),
        });
        const policy = new Policy({ slug: "superseded", dir, locales: ["en"] });
        expect(policy.effective(new Date("2026-07-15T00:00:00Z"))?.revision).toBe("2026-07-02");
        expect(policy.pending(new Date("2026-07-01T00:00:00Z"))?.revision).toBe("2026-07-02");
        expect(policy.pending(new Date("2026-08-01T00:00:00Z"))).toBeUndefined();
    });

    it("supersedes against EVERY newer revision, not just the adjacent one", () => {
        // The middle revision postpones further out (eff 2026-10-01) than the first pending one
        // (eff 2026-09-01); then an immediate third revision (eff 2026-08-01) supersedes BOTH.
        // The first revision's ADJACENT successor alone would not supersede it - only the
        // min-effectiveFrom scan across all newer revisions does.
        const dir = makePolicyDir({
            "2026-07-01/en.mdx": validDefault("2026-09-01"),
            "2026-07-05/en.mdx": validDefault("2026-10-01"),
            "2026-07-10/en.mdx": validDefault("2026-08-01"),
        });
        const policy = new Policy({ slug: "non-adjacent", dir, locales: ["en"] });
        expect(policy.pending(new Date("2026-07-20T00:00:00Z"))?.revision).toBe("2026-07-10");
        // After 2026-08-01 nothing is pending: the first revision's 2026-09-01 must never be
        // announced even though its own adjacent successor does not supersede it.
        expect(policy.pending(new Date("2026-08-15T00:00:00Z"))).toBeUndefined();
        expect(policy.effective(new Date("2026-10-02T00:00:00Z"))?.revision).toBe("2026-07-10");
    });

    it("on an effectiveFrom tie the newest revision wins, matching effective()", () => {
        const dir = makePolicyDir({
            "2026-08-01/en.mdx": validDefault("2026-09-01"),
            "2026-08-15/en.mdx": validDefault("2026-09-01"),
        });
        const policy = new Policy({ slug: "tie", dir, locales: ["en"] });
        expect(policy.pending(new Date("2026-08-20T00:00:00Z"))?.revision).toBe("2026-08-15");
        expect(policy.effective(new Date("2026-09-01T00:00:00Z"))?.revision).toBe("2026-08-15");
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

describe("has - the cheap existence check", () => {
    it("mirrors content() exactly, for every combination that matters", () => {
        // The point of having it at all: a route that must choose between rendering and a 404 was
        // calling content() twice - once to test, once for the value. If the two ever disagreed, a
        // page would 404 on text it holds, or render `undefined`.
        const cases: ReadonlyArray<[string, string]> = [
            ["2026-07-07", "en"],
            ["2026-07-07", "nl"],
            ["2026-07-07", "de"],
            ["2026-01-01", "en"],
            ["garbage", "en"],
        ];
        for (const [revision, locale] of cases) {
            expect(terms.has(revision, locale), `${revision}/${locale}`).toBe(
                terms.content(revision, locale) !== undefined,
            );
        }
    });

    it("is false for a locale legally absent from an old revision, true once introduced", () => {
        // The contiguity rule in one assertion: Dutch arrives with the 2026-08-01 privacy revision
        // and is genuinely absent before it - absence is an ANSWER here, not a failure.
        expect(privacy.has("2026-07-14", "nl")).toBe(false);
        expect(privacy.has("2026-08-01", "nl")).toBe(true);
    });

    it("does not throw on untrusted input - it is fed route params", () => {
        for (const garbage of ["", "../../etc/passwd", "2026-13-45", "drafts"]) {
            expect(() => terms.has(garbage, garbage)).not.toThrow();
            expect(terms.has(garbage, garbage)).toBe(false);
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
