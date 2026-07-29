import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The core entry's structural promise: its module graph is react-free. Consumers' server-side
 * core packages import the root entry under architecture rules that forbid react/next, and
 * those rules cannot see through a package boundary - so the promise is enforced here, at the
 * source. Any react, react-dom, next, next-mdx-remote, or server-only import (or re-export - an
 * `export ... from` pulls the module in just the same, or a dynamic `import("...")` - bundlers
 * follow a static string literal just like a static import) in `src/index.ts` or `src/policy/`
 * breaks the consumer and must fail this test.
 */

/** Module specifiers forbidden in any import, re-export, or dynamic import in the core entry. */
const FORBIDDEN =
    /(?:^\s*(?:import|export)\s[^;]*?|\bimport\s*\(\s*)["'](react|react-dom|next|next-mdx-remote|server-only)(\/[^"']*)?["']/m;

describe("core entry", () => {
    it("has zero react/next imports in its module graph", () => {
        // Recursive over ALL of src/ minus src/react/ (the one module allowed to touch react)
        // and tests: the promise covers the root entry's transitive graph, so a future nested
        // core module must not slip past a flat file listing.
        const src = fileURLToPath(new URL("../../", import.meta.url));
        const files = fs
            .readdirSync(src, { recursive: true, withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
            .map((entry) => path.join(entry.parentPath, entry.name))
            .filter((file) => {
                const rel = path.relative(src, file);
                return !rel.startsWith(`react${path.sep}`) && !rel.split(path.sep).includes("tests");
            });
        expect(files.length).toBeGreaterThanOrEqual(5);
        for (const file of files) {
            const match = FORBIDDEN.exec(fs.readFileSync(file, "utf8"));
            expect(match, `${file} imports "${match?.[1]}"`).toBeNull();
        }
    });

    it("the forbidden-specifier regex catches every import form and no benign one", () => {
        const violations = [
            'import React from "react";',
            'import { renderToString } from "react-dom/server";',
            'import "server-only";',
            'export { MDXRemote } from "next-mdx-remote/rsc";',
            'export * from "next/navigation";',
            'import {\n    something,\n} from "react";',
            'const mod = await import("react-dom/server");',
        ];
        for (const snippet of violations) {
            expect(FORBIDDEN.test(snippet), `missed: ${snippet}`).toBe(true);
        }
        const benign = [
            'import fs from "node:fs";',
            'import matter from "gray-matter";',
            'export * from "./policy/errors.js";',
            ' * imports ONLY `node:fs`, `node:path`, and `gray-matter` - never react or next',
            'import { PolicyValidationError } from "./errors.js";',
        ];
        for (const snippet of benign) {
            expect(FORBIDDEN.test(snippet), `false positive: ${snippet}`).toBe(false);
        }
    });
});
