import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The core entry's structural promise: its module graph is react-free. Consumers' server-side
 * core packages import the root entry under architecture rules that forbid react/next, and
 * those rules cannot see through a package boundary - so the promise is enforced here, at the
 * source. Any react, react-dom, next, next-mdx-remote, or server-only import in `src/index.ts`
 * or `src/policy/` breaks the consumer and must fail this test.
 */

/** Import sources forbidden anywhere in the core entry's module graph. */
const FORBIDDEN = /^\s*import\s[^;]*?["'](react|react-dom|next|next-mdx-remote|server-only)(\/[^"']*)?["']/m;

describe("core entry", () => {
    it("has zero react/next imports in its module graph", () => {
        const src = fileURLToPath(new URL("../../", import.meta.url));
        const files = [
            path.join(src, "index.ts"),
            ...fs
                .readdirSync(path.join(src, "policy"), { withFileTypes: true })
                .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
                .map((entry) => path.join(src, "policy", entry.name)),
        ];
        expect(files.length).toBeGreaterThanOrEqual(5);
        for (const file of files) {
            const match = FORBIDDEN.exec(fs.readFileSync(file, "utf8"));
            expect(match, `${file} imports "${match?.[1]}"`).toBeNull();
        }
    });
});
