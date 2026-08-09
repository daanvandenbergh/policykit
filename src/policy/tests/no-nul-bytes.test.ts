import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * No file this package ships contains a RAW NUL byte.
 *
 * **A ONE-BYTE, INVISIBLE, SINGLE-ENGINE OUTAGE - AND THIS PACKAGE SHIPPED ONE.** `react/mdx.ts`
 * joined its cache key on a literal NUL instead of the escape, and it went out in a published
 * release: the editor renders the byte as nothing, the diff renders it as nothing, `tsc`
 * accepted it, the whole suite stayed green, and Chrome ran it perfectly - V8 tolerates a raw NUL
 * inside a string literal. SpiderMonkey does not: its tokenizer treats NUL as END OF INPUT, so the
 * enclosing string is "not terminated before end of script" and the module never parses. Firefox
 * reports that with no file, no line and no module.
 *
 * A LIBRARY is the worst place for it. Consumers bundle this source, and a bundler's dev output
 * wraps each module in `eval()` - so the failure surfaces in somebody else's app, in one engine, as
 * a blank page, and nothing in their stack points back here.
 *
 * **A NUL DELIMITER IS FINE - WRITE IT AS `\u0000`.** This is not a ban on the character: the MDX
 * cache key uses one deliberately, because neither an options signature nor MDX source can contain
 * it. The escape produces the identical character, so every key built from one is unchanged, while
 * staying visible in an editor, a diff and a review. What this bans is the raw byte on disk.
 *
 * `dist/` is scanned too when it is present: it is the artefact that actually reaches consumers, and
 * a stale build carrying the byte is exactly as fatal as the source would be.
 */

/** The package root - this file sits at `src/policy/tests/`. */
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** The trees worth scanning: hand-written source, and the built output that ships. */
const ROOTS = ["src", "dist"] as const;

/** Directories never worth walking - none of them is source this package publishes. */
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "coverage"]);

/** The extensions a NUL can actually break. Deliberately an allowlist: an image is not a bug. */
const EXTENSIONS = /\.(?:tsx?|jsx?|mjs|cjs|css|json|md|mdx|ya?ml|html|txt)$/;

/**
 * Every scannable file under `dir`, as paths relative to the package root.
 *
 * @param dir - absolute directory to walk.
 * @returns package-relative paths.
 */
function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) {
                out.push(...walk(join(dir, entry.name)));
            }
        } else if (EXTENSIONS.test(entry.name)) {
            out.push(relative(ROOT, join(dir, entry.name)));
        }
    }
    return out;
}

describe("shipped files carry no NUL bytes", () => {
    const files = ROOTS.filter((root) => existsSync(join(ROOT, root))).flatMap((root) =>
        walk(join(ROOT, root)),
    );

    it("scans a real, non-trivial set of files - a vacuous pass would be worthless here", () => {
        // The guard on the guard: a walk that quietly found nothing (a renamed directory, a broken
        // skip list, a glob typo) would report "no NUL bytes anywhere" forever while checking
        // nothing at all - which is precisely the failure mode this whole test exists to catch.
        expect(files.length).toBeGreaterThan(20);
        expect(files).toContain(join("src", "react", "mdx.ts"));
    });

    it("finds none", () => {
        const offenders = files
            .map((file) => ({ file, at: readFileSync(join(ROOT, file)).indexOf(0) }))
            .filter((found) => found.at !== -1)
            .map((found) => `${found.file} (byte ${found.at})`);
        // Named WITH THE OFFSET, not counted: the whole problem with this byte is that you cannot
        // see where it is, and a bare "1 file failed" leaves the next person exactly where we were.
        expect(offenders).toEqual([]);
    });
});
