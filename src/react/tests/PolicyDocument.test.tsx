import path from "node:path";
import { fileURLToPath } from "node:url";
import type { JSX, ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Policy } from "../../index.js";
import { makePolicyDir, validDefault } from "../../policy/tests/helpers.js";
import { PolicyDocument } from "../index.js";

/**
 * Render smoke tests for `PolicyDocument` against the REAL MDX pipeline (no mocked compiler):
 * GFM pipe tables must become `<table>` markup (a DPA's tables silently corrupting into literal
 * `|` text is the failure this guards), and the consumer's component map must receive the
 * MDX-authored props.
 */

const FIXTURES = fileURLToPath(new URL("../../policy/tests/fixtures/", import.meta.url));
const terms = new Policy({ slug: "terms-of-service", dir: path.join(FIXTURES, "terms"), locales: ["en", "nl"] });
const privacy = new Policy({ slug: "privacy", dir: path.join(FIXTURES, "privacy"), locales: ["en", "nl"] });

/**
 * Renders an element tree that may be rooted in async server components (`PolicyDocument`,
 * `MDXRemote`) to static HTML: resolves function components at the root until a host element or
 * fragment remains, then hands the sync tree to `renderToStaticMarkup`.
 */
async function render(node: unknown): Promise<string> {
    let element = node as ReactElement;
    while (typeof element.type === "function") {
        const component = element.type as (props: unknown) => unknown;
        element = (await component(element.props)) as ReactElement;
    }
    return renderToStaticMarkup(element);
}

describe("PolicyDocument", () => {
    it("renders a GFM pipe table as real table markup", async () => {
        const html = await render(
            await PolicyDocument({ policy: terms, locale: "en", revision: "2026-07-28" }),
        );
        expect(html).toContain("<table>");
        expect(html).toContain("Monthly limit");
        expect(html).not.toContain("| Plan |");
    });

    it("passes MDX-authored props through the consumer's component map", async () => {
        const html = await render(
            await PolicyDocument({
                policy: terms,
                locale: "en",
                revision: "2026-07-28",
                components: {
                    a: (props: JSX.IntrinsicElements["a"]) => (
                        <a data-consumer-link href={props.href}>{props.children}</a>
                    ),
                },
            }),
        );
        expect(html).toContain("data-consumer-link");
        expect(html).toContain('href="/legal/terms-of-service/2026-07-07"');
    });

    it("renders an explicit revision in a non-default locale", async () => {
        const html = await render(
            await PolicyDocument({ policy: terms, locale: "nl", revision: "2026-07-07" }),
        );
        expect(html).toContain("Overeenkomst");
    });

    it("defaults to the effective-else-latest revision when revision is omitted", async () => {
        // A single-revision policy so effective(now) ?? latest() resolves to the same revision
        // under ANY wall clock - the component reads new Date() internally.
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault("2026-07-07", {}) + "\nThe solo revision body.\n",
        });
        const solo = new Policy({ slug: "solo", dir, locales: ["en"] });
        const html = await render(await PolicyDocument({ policy: solo, locale: "en" }));
        expect(html).toContain("The solo revision body.");
    });

    it("throws on a (revision, locale) pair without content, telling the consumer to guard", async () => {
        await expect(
            PolicyDocument({ policy: privacy, locale: "nl", revision: "2026-07-14" }),
        ).rejects.toThrow(/guard with policy\.revision/);
    });
});
