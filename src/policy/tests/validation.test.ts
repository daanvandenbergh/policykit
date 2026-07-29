import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PolicyValidationError } from "../errors.js";
import { Policy, assertValidAll } from "../policy.js";
import { fixture, makePolicyDir, mdx, validDefault } from "./helpers.js";

/**
 * Every validation rule, red and green: the constructor guards, the layout grammar, the
 * frontmatter contract, locale contiguity, and `assertValidAll`.
 */

/** Builds a Policy over `dir` with the standard test locales. */
function policyAt(dir: string, locales: readonly string[] = ["en", "nl"]): Policy {
    return new Policy({ slug: "test-policy", dir, locales });
}

/** Asserts `fn` throws a PolicyValidationError whose message matches every given fragment. */
function expectViolation(fn: () => unknown, ...fragments: string[]): PolicyValidationError {
    let caught: unknown;
    try {
        fn();
    } catch (error) {
        caught = error;
    }
    expect(caught).toBeInstanceOf(PolicyValidationError);
    for (const fragment of fragments) {
        expect((caught as Error).message).toContain(fragment);
    }
    return caught as PolicyValidationError;
}

describe("constructor", () => {
    it("throws on a relative dir, without touching the filesystem", () => {
        const error = expectViolation(
            () => new Policy({ slug: "terms", dir: "policies/terms", locales: ["en"] }),
            "absolute path",
            "policies/terms",
        );
        expect(error.slug).toBe("terms");
    });

    it("throws when defaultLocale is not in locales", () => {
        expectViolation(
            () => new Policy({ slug: "terms", dir: fixture("terms"), locales: ["nl"] }),
            'defaultLocale "en"',
        );
    });

    it("does no IO at construction - a bad directory only throws at first use", () => {
        const policy = policyAt(path.join(fixture("terms"), "does-not-exist"));
        expectViolation(() => policy.revisions(), "does not exist");
    });
});

describe("layout grammar", () => {
    it("loads the terms fixture: revisions ascending, drafts/ ignored wholesale", () => {
        const revisions = policyAt(fixture("terms")).revisions();
        expect(revisions.map((rev) => rev.revision)).toEqual(["2026-07-07", "2026-07-28"]);
        expect(revisions[1]).toMatchObject({
            effectiveFrom: "2026-08-12",
            notice: "notify",
            title: "Terms of Service",
            locales: ["en", "nl"],
        });
        expect(revisions[1].changeSummary).toContain("fair-use");
    });

    it("rejects a non-date directory at the policy root, naming it", () => {
        const dir = makePolicyDir({ "2026-8-15/en.mdx": validDefault("2026-08-15") });
        const error = expectViolation(() => policyAt(dir).revisions(), '"2026-8-15"');
        expect(error.file).toBe("2026-8-15");
    });

    it("rejects a stray file at the policy root, naming it", () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault(),
            "notes.txt": "stray",
        });
        expectViolation(() => policyAt(dir).revisions(), '"notes.txt"');
    });

    it("rejects a date-named FILE at the policy root (a revision is a directory)", () => {
        const dir = makePolicyDir({ "2026-07-07": "not a directory" });
        expectViolation(() => policyAt(dir).revisions(), '"2026-07-07"');
    });

    it("rejects a non-locale filename inside a revision directory, naming the file", () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault(),
            "2026-07-07/readme.md": "stray",
        });
        const error = expectViolation(() => policyAt(dir).revisions(), '"2026-07-07/readme.md"');
        expect(error.file).toBe("2026-07-07/readme.md");
    });

    it("rejects a grammar-valid locale file for an unconfigured locale", () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault(),
            "2026-07-07/fr.mdx": mdx({ title: "Conditions" }),
        });
        expectViolation(() => policyAt(dir).revisions(), '"2026-07-07/fr.mdx"', 'locale "fr"');
    });

    it("rejects a revision missing its default-locale file", () => {
        const dir = makePolicyDir({ "2026-07-07/nl.mdx": mdx({ title: "Voorwaarden" }) });
        expectViolation(() => policyAt(dir).revisions(), "default-locale", "2026-07-07/en.mdx");
    });

    it("rejects a policy directory with no revisions, and a missing directory", () => {
        expectViolation(() => policyAt(makePolicyDir({})).revisions(), "no revisions");
        expectViolation(() => policyAt("/nonexistent/policykit-nowhere").revisions(), "does not exist");
    });
});

describe("frontmatter contract", () => {
    it("rejects effectiveFrom before the revision date", () => {
        const dir = makePolicyDir({ "2026-07-07/en.mdx": validDefault("2026-07-06") });
        const error = expectViolation(() => policyAt(dir).revisions(), "effectiveFrom", "2026-07-06");
        expect(error.field).toBe("effectiveFrom");
        expect(error.file).toBe("2026-07-07/en.mdx");
    });

    it("accepts effectiveFrom equal to the revision date, quoted or as a bare YAML date", () => {
        const quoted = makePolicyDir({ "2026-07-07/en.mdx": validDefault('"2026-07-07"') });
        expect(policyAt(quoted).latest().effectiveFrom).toBe("2026-07-07");
        const bare = makePolicyDir({ "2026-07-07/en.mdx": validDefault("2026-07-07") });
        expect(policyAt(bare).latest().effectiveFrom).toBe("2026-07-07");
    });

    it("rejects a missing or malformed effectiveFrom", () => {
        const missing = makePolicyDir({
            "2026-07-07/en.mdx": mdx({ notice: "none", changeSummary: "A change." }),
        });
        expectViolation(() => policyAt(missing).revisions(), '"effectiveFrom"');
        const malformed = makePolicyDir({ "2026-07-07/en.mdx": validDefault("soon") });
        expectViolation(() => policyAt(malformed).revisions(), '"effectiveFrom"');
    });

    it("rejects a missing or unknown notice tier", () => {
        const missing = makePolicyDir({
            "2026-07-07/en.mdx": mdx({ effectiveFrom: "2026-07-07", changeSummary: "A change." }),
        });
        expectViolation(() => policyAt(missing).revisions(), '"notice"');
        const unknown = makePolicyDir({
            "2026-07-07/en.mdx": validDefault("2026-07-07", { notice: "immediately" }),
        });
        const error = expectViolation(() => policyAt(unknown).revisions(), '"notice"');
        expect(error.field).toBe("notice");
    });

    it("rejects a missing or empty changeSummary", () => {
        const empty = makePolicyDir({
            "2026-07-07/en.mdx": validDefault("2026-07-07", { changeSummary: '""' }),
        });
        expectViolation(() => policyAt(empty).revisions(), '"changeSummary"');
        const missing = makePolicyDir({
            "2026-07-07/en.mdx": mdx({ effectiveFrom: "2026-07-07", notice: "none" }),
        });
        expectViolation(() => policyAt(missing).revisions(), '"changeSummary"');
    });

    it("rejects an unknown frontmatter key in the default-locale file", () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault("2026-07-07", { lastUpdated: "2026-07-07" }),
        });
        const error = expectViolation(() => policyAt(dir).revisions(), '"lastUpdated"');
        expect(error.field).toBe("lastUpdated");
    });

    it("rejects metadata keys in a non-default locale file - metadata lives in ONE file", () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault(),
            "2026-07-07/nl.mdx": mdx({ effectiveFrom: "2026-07-07", title: "Voorwaarden" }),
        });
        const error = expectViolation(() => policyAt(dir).revisions(), '"effectiveFrom"', "2026-07-07/nl.mdx");
        expect(error.file).toBe("2026-07-07/nl.mdx");
    });
});

describe("locale contiguity", () => {
    it("allows a locale introduced at a later revision (no backdated translations)", () => {
        const revisions = policyAt(fixture("privacy")).revisions();
        expect(revisions[0].locales).toEqual(["en"]);
        expect(revisions[1].locales).toEqual(["en", "nl"]);
    });

    it("rejects a locale present at one revision but missing from a later one", () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault(),
            "2026-07-07/nl.mdx": mdx({ title: "Voorwaarden" }),
            "2026-08-01/en.mdx": validDefault("2026-08-01"),
        });
        const error = expectViolation(() => policyAt(dir).revisions(), 'locale "nl"', "2026-07-07", "2026-08-01");
        expect(error.file).toBe("2026-08-01/nl.mdx");
    });

    it("allows a configured locale that no revision has yet (its introduction is pending)", () => {
        const dir = makePolicyDir({ "2026-07-07/en.mdx": validDefault() });
        expect(policyAt(dir).revisions()).toHaveLength(1);
    });
});

describe("assertValid / assertValidAll", () => {
    it("assertValid passes on the fixtures and throws the first violation on a broken dir", () => {
        expect(() => policyAt(fixture("terms")).assertValid()).not.toThrow();
        const broken = makePolicyDir({ "2026-07-07/en.mdx": validDefault("2026-01-01") });
        expectViolation(() => policyAt(broken).assertValid(), "effectiveFrom");
    });

    it("assertValidAll validates every policy and rejects duplicate slugs", () => {
        const terms = new Policy({ slug: "terms", dir: fixture("terms"), locales: ["en", "nl"] });
        const privacy = new Policy({ slug: "privacy", dir: fixture("privacy"), locales: ["en", "nl"] });
        expect(() => assertValidAll([terms, privacy])).not.toThrow();
        const duplicate = new Policy({ slug: "terms", dir: fixture("privacy"), locales: ["en", "nl"] });
        expectViolation(() => assertValidAll([terms, duplicate]), "Duplicate policy slug", '"terms"');
    });

    it("rejects a revision directory that exists but is empty", () => {
        const dir = makePolicyDir({ "2026-07-07/en.mdx": validDefault() });
        fs.mkdirSync(path.join(dir, "2026-08-01"));
        expectViolation(() => policyAt(dir).revisions(), "default-locale", "2026-08-01/en.mdx");
    });
});
