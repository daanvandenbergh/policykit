import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Policy } from "../../index.js";
import { makePolicyDir, mdx } from "../../policy/tests/helpers.js";
import { PolicyBanner } from "../index.js";

/**
 * `PolicyBanner` renders whatever `children` returns for the announced revision, and nothing at
 * all when no pending revision owes notice - the selection itself is covered by
 * `src/policy/tests/banner.test.ts`.
 */

const FIXTURES = fileURLToPath(new URL("../../policy/tests/fixtures/", import.meta.url));
const terms = new Policy({ slug: "terms-of-service", dir: path.join(FIXTURES, "terms"), locales: ["en", "nl"] });
const privacy = new Policy({ slug: "privacy", dir: path.join(FIXTURES, "privacy"), locales: ["en", "nl"] });

describe("PolicyBanner", () => {
    it("renders the consumer's copy for the announced revision", () => {
        const html = renderToStaticMarkup(
            PolicyBanner({
                policies: [terms, privacy],
                now: new Date("2026-08-01T00:00:00Z"),
                children: ({ policy, revision }) => (
                    <p data-slug={policy.slug}>Takes effect on {revision.effectiveFrom}.</p>
                ),
            }) as ReactElement,
        );
        expect(html).toContain('data-slug="terms-of-service"');
        expect(html).toContain("Takes effect on 2026-08-12.");
    });

    it("renders null and never calls children when nothing pending owes notice", () => {
        let called = false;
        const output = PolicyBanner({
            policies: [terms, privacy],
            now: new Date("2026-12-01T00:00:00Z"),
            children: () => {
                called = true;
                return <p>unreachable</p>;
            },
        });
        expect(output).toBeNull();
        expect(called).toBe(false);
    });

    it("defaults now to the current date", () => {
        // A far-future notify revision is pending under any real clock, so the default `now`
        // must announce it without the prop being passed.
        const dir = makePolicyDir({
            "9999-01-01/en.mdx": mdx({ effectiveFrom: "9999-01-01", notice: "notify", changeSummary: "Later." }),
        });
        const future = new Policy({ slug: "future", dir, locales: ["en"] });
        const html = renderToStaticMarkup(
            PolicyBanner({
                policies: [future],
                children: ({ revision }) => <p>{revision.effectiveFrom}</p>,
            }) as ReactElement,
        );
        expect(html).toContain("9999-01-01");
    });
});
