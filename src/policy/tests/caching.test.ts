import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { Policy } from "../policy.js";
import { makePolicyDir, validDefault } from "./helpers.js";

/**
 * The per-file parse cache: an edited file reparses (no stale entry is ever served), and a
 * failed parse caches nothing, so fixing the file heals the instance without a restart.
 */

/** Rewrites a file and pushes its mtime forward, defeating coarse timestamp granularity. */
function rewrite(abs: string, content: string): void {
    fs.writeFileSync(abs, content);
    const future = new Date(Date.now() + 10_000);
    fs.utimesSync(abs, future, future);
}

describe("parse cache", () => {
    it("reparses an edited file - the archive follows the disk, not the cache", () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault("2026-07-07", { changeSummary: "Before." }),
        });
        const policy = new Policy({ slug: "cached", dir, locales: ["en"] });
        expect(policy.latest().changeSummary).toBe("Before.");
        rewrite(
            path.join(dir, "2026-07-07/en.mdx"),
            validDefault("2026-07-07", { changeSummary: "After." }),
        );
        expect(policy.latest().changeSummary).toBe("After.");
    });

    it("serves the cached parse while the file is unchanged - no second read", () => {
        const dir = makePolicyDir({ "2026-07-07/en.mdx": validDefault() });
        const policy = new Policy({ slug: "cached", dir, locales: ["en"] });
        const first = policy.revisions();
        const spy = vi.spyOn(fs, "readFileSync");
        try {
            expect(policy.revisions()).toEqual(first);
            expect(spy).not.toHaveBeenCalled();
        } finally {
            spy.mockRestore();
        }
    });

    it("reparses when only the SIZE changed - a rewrite too fast for the timestamp to notice", () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault("2026-07-07", { changeSummary: "Before." }),
        });
        const abs = path.join(dir, "2026-07-07/en.mdx");
        const frozen = new Date("2026-07-07T00:00:00Z");
        fs.utimesSync(abs, frozen, frozen);
        const policy = new Policy({ slug: "sized", dir, locales: ["en"] });
        expect(policy.latest().changeSummary).toBe("Before.");
        fs.writeFileSync(abs, validDefault("2026-07-07", { changeSummary: "After, and longer." }));
        fs.utimesSync(abs, frozen, frozen);
        expect(policy.latest().changeSummary).toBe("After, and longer.");
    });

    it("never caches a failed parse - errors re-throw every call, and a fix heals in place", () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault("2026-07-07", { notice: "shout" }),
        });
        const policy = new Policy({ slug: "healing", dir, locales: ["en"] });
        expect(() => policy.assertValid()).toThrow(/notice/);
        expect(() => policy.assertValid()).toThrow(/notice/);
        rewrite(path.join(dir, "2026-07-07/en.mdx"), validDefault());
        expect(() => policy.assertValid()).not.toThrow();
    });
});
