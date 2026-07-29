import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PolicyValidationError } from "../errors.js";
import { resolveWithin } from "../load.js";
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

    it("rejects a calendar-impossible revision directory", () => {
        const dir = makePolicyDir({ "2026-02-30/en.mdx": validDefault("2026-03-01") });
        expectViolation(() => policyAt(dir).revisions(), '"2026-02-30"');
    });

    it("accepts a dir configured with a trailing separator", () => {
        const dir = makePolicyDir({ "2026-07-07/en.mdx": validDefault() });
        const policy = new Policy({ slug: "trailing", dir: dir + path.sep, locales: ["en"] });
        expect(policy.latest().revision).toBe("2026-07-07");
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

    it("supports region-variant locales (nl-NL) end to end", () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault(),
            "2026-07-07/nl-NL.mdx": mdx({ title: "Voorwaarden" }, "Regiotekst."),
        });
        const policy = new Policy({ slug: "region", dir, locales: ["en", "nl-NL"] });
        expect(policy.revisions()[0].locales).toEqual(["en", "nl-NL"]);
        expect(policy.content("2026-07-07", "nl-NL")?.source).toContain("Regiotekst.");
    });

    it("rejects a wrong-cased locale filename", () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault(),
            "2026-07-07/NL-nl.mdx": mdx({ title: "Voorwaarden" }),
        });
        expectViolation(
            () => new Policy({ slug: "region", dir, locales: ["en", "nl-NL"] }).revisions(),
            '"2026-07-07/NL-nl.mdx"',
        );
    });

    it("rejects a subdirectory inside a revision directory", () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault(),
            "2026-07-07/old/en.mdx": "archived copy",
        });
        expectViolation(() => policyAt(dir).revisions(), '"2026-07-07/old"');
    });

    it("rejects a stray FILE named drafts at the root (only the drafts directory is ignored)", () => {
        const dir = makePolicyDir({ "2026-07-07/en.mdx": validDefault(), "drafts": "notes" });
        expectViolation(() => policyAt(dir).revisions(), '"drafts"');
    });

    it("rejects a revision missing its default-locale file", () => {
        const dir = makePolicyDir({ "2026-07-07/nl.mdx": mdx({ title: "Voorwaarden" }) });
        expectViolation(() => policyAt(dir).revisions(), "default-locale", "2026-07-07/en.mdx");
    });

    it("rejects a policy directory with no revisions, and a missing directory", () => {
        expectViolation(() => policyAt(makePolicyDir({})).revisions(), "no revisions");
        expectViolation(() => policyAt("/nonexistent/policykit-nowhere").revisions(), "does not exist");
    });

    it("rejects a dir that points at a file, as a PolicyValidationError naming it", () => {
        const dir = makePolicyDir({ "2026-07-07/en.mdx": validDefault() });
        const error = expectViolation(
            () => policyAt(path.join(dir, "2026-07-07/en.mdx")).revisions(),
            "not a directory",
        );
        expect(error.slug).toBe("test-policy");
    });
});

describe("frontmatter contract", () => {
    it("rejects effectiveFrom before the revision date", () => {
        const dir = makePolicyDir({ "2026-07-07/en.mdx": validDefault("2026-07-06") });
        const error = expectViolation(() => policyAt(dir).revisions(), "effectiveFrom", "2026-07-06");
        expect(error.field).toBe("effectiveFrom");
        expect(error.file).toBe("2026-07-07/en.mdx");
    });

    it("names BOTH the file and the field in the message, not only in the details", () => {
        // The message is what a developer actually reads - in a failed `next build`, in a CI log, in
        // a thrown stack. The structured `{ file, field }` is for code; if only the structure carried
        // the location, every human-facing report of a broken policy would say "something is wrong"
        // and make somebody go hunting through the corpus for it.
        const dir = makePolicyDir({ "2026-07-07/en.mdx": validDefault("2026-07-06") });
        const error = expectViolation(() => policyAt(dir).revisions());
        expect(error.message).toContain("2026-07-07/en.mdx");
        expect(error.message).toContain("effectiveFrom");
        // And the slug, so a multi-policy `assertValidAll` failure says WHICH document broke.
        expect(error.message).toContain(error.slug);
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
        // Unpadded dates stay YAML strings (the date-only timestamp form requires zero
        // padding), so they must fail the calendar check - the contract is zero-padded ISO.
        const unpadded = makePolicyDir({ "2026-07-07/en.mdx": validDefault("2026-8-5") });
        expectViolation(() => policyAt(unpadded).revisions(), '"effectiveFrom"');
    });

    it("rejects a calendar-impossible effectiveFrom, quoted or rolled over by YAML", () => {
        const quoted = makePolicyDir({ "2026-07-07/en.mdx": validDefault('"2026-02-30"') });
        expect(expectViolation(() => policyAt(quoted).revisions()).field).toBe("effectiveFrom");
        // Unquoted, YAML's timestamp rule ROLLS an impossible date over to a real but
        // different day (2026-13-45 becomes 2027-02-14) - the loader must reject it rather
        // than silently bind a legal document on a day nobody wrote.
        const rolled = makePolicyDir({ "2026-07-07/en.mdx": validDefault("2026-13-45") });
        expect(expectViolation(() => policyAt(rolled).revisions()).field).toBe("effectiveFrom");
    });

    it("wraps malformed frontmatter YAML in a PolicyValidationError naming the file", () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": "---\nnotice: [unclosed\n---\n\nBody.\n",
        });
        const error = expectViolation(
            () => policyAt(dir).revisions(),
            '"2026-07-07/en.mdx"',
            "frontmatter YAML",
        );
        expect(error.file).toBe("2026-07-07/en.mdx");
    });

    it("rejects non-mapping frontmatter", () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault(),
            "2026-07-07/nl.mdx": "---\n42\n---\n\nBody.\n",
        });
        expectViolation(() => policyAt(dir).revisions(), '"2026-07-07/nl.mdx"', "mapping");
        // A bare date scalar resolves to a Date OBJECT under YAML's timestamp rule - an object
        // with zero own keys, which would read as empty-but-valid frontmatter. It must still
        // fail as non-mapping, never validate green.
        const dateScalar = makePolicyDir({
            "2026-07-07/en.mdx": validDefault(),
            "2026-07-07/nl.mdx": "---\n2026-07-07\n---\n\nBody.\n",
        });
        expectViolation(() => policyAt(dateScalar).revisions(), '"2026-07-07/nl.mdx"', "mapping");
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

    it("rejects an effectiveFrom carrying a time component - the package is day-granular", () => {
        const dir = makePolicyDir({ "2026-07-07/en.mdx": validDefault("2026-07-07T12:00:00Z") });
        const error = expectViolation(() => policyAt(dir).revisions(), '"effectiveFrom"');
        expect(error.field).toBe("effectiveFrom");
    });

    it("rejects wrong-typed frontmatter values, naming the field", () => {
        const cases: [string, string][] = [
            ["title", validDefault("2026-07-07", { title: "123" })],
            ["changeSummary", validDefault("2026-07-07", { changeSummary: "42" })],
            ["notice", validDefault("2026-07-07", { notice: "true" })],
        ];
        for (const [field, content] of cases) {
            const dir = makePolicyDir({ "2026-07-07/en.mdx": content });
            expect(expectViolation(() => policyAt(dir).revisions()).field).toBe(field);
        }
    });

    it("rejects an empty title in either file kind", () => {
        const def = makePolicyDir({ "2026-07-07/en.mdx": validDefault("2026-07-07", { title: '""' }) });
        expect(expectViolation(() => policyAt(def).revisions()).field).toBe("title");
        const other = makePolicyDir({
            "2026-07-07/en.mdx": validDefault(),
            "2026-07-07/nl.mdx": mdx({ title: '""' }),
        });
        const error = expectViolation(() => policyAt(other).revisions(), "2026-07-07/nl.mdx");
        expect(error.field).toBe("title");
    });

    it("rejects an empty MDX body in either file kind - frontmatter alone is not a document", () => {
        const def = makePolicyDir({
            "2026-07-07/en.mdx": mdx({ effectiveFrom: "2026-07-07", notice: "none", changeSummary: '"A change."' }, ""),
        });
        const error = expectViolation(() => policyAt(def).revisions(), "empty MDX body", "2026-07-07/en.mdx");
        expect(error.file).toBe("2026-07-07/en.mdx");
        const other = makePolicyDir({
            "2026-07-07/en.mdx": validDefault(),
            "2026-07-07/nl.mdx": mdx({ title: '"Voorwaarden"' }, ""),
        });
        expectViolation(() => policyAt(other).revisions(), "empty MDX body", "2026-07-07/nl.mdx");
    });

    it("honours a non-en defaultLocale for metadata placement", () => {
        const green = makePolicyDir({
            "2026-07-07/nl.mdx": validDefault("2026-07-07", { title: "Voorwaarden" }),
            "2026-07-07/en.mdx": mdx({ title: "Terms" }),
        });
        const dutch = new Policy({ slug: "dutch", dir: green, locales: ["en", "nl"], defaultLocale: "nl" });
        expect(dutch.latest().title).toBe("Voorwaarden");
        const red = makePolicyDir({
            "2026-07-07/en.mdx": validDefault(),
            "2026-07-07/nl.mdx": mdx({ title: "Voorwaarden" }),
        });
        const error = expectViolation(
            () => new Policy({ slug: "dutch", dir: red, locales: ["en", "nl"], defaultLocale: "nl" }).revisions(),
            "2026-07-07/en.mdx",
        );
        expect(error.field).toBe("effectiveFrom");
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

describe("resolveWithin", () => {
    it("confines every resolved path to the policy directory", () => {
        expect(resolveWithin("/policies/terms", "2026-07-07/en.mdx")).toBe(
            path.join("/policies/terms", "2026-07-07/en.mdx"),
        );
        expect(resolveWithin("/policies/terms", "../secrets.txt")).toBeUndefined();
        expect(resolveWithin("/policies/terms", "../terms-evil/en.mdx")).toBeUndefined();
        expect(resolveWithin("/policies/terms", "/etc/passwd")).toBeUndefined();
        expect(resolveWithin("/policies/terms", "a/../../x")).toBeUndefined();
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
