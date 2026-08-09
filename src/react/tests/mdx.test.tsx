import fs from "node:fs";
import path from "node:path";
import type { JSX, ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Policy } from "../../index.js";
import { makePolicyDir, mdx, validDefault } from "../../policy/tests/helpers.js";
import { PolicyDocument } from "../index.js";
import { MdxContent } from "../mdx.js";

/**
 * The compiled-MDX cache behind `PolicyDocument`. Compiling a 30KB policy body costs ~33ms against
 * ~0.25ms for everything else the component does, so it is memoized per `(options, source)` - and
 * the one thing that must never happen is an edited revision rendering its old legal text. That is
 * the first test here, end to end through the loader.
 */

/** Rewrites a file and pushes its mtime forward, defeating coarse timestamp granularity. */
function rewrite(abs: string, content: string): void {
    fs.writeFileSync(abs, content);
    const future = new Date(Date.now() + 10_000);
    fs.utimesSync(abs, future, future);
}

/**
 * Renders an element tree that may be rooted in async server components to static HTML: resolves
 * function components at the root until a host element or fragment remains, then hands the
 * synchronous tree to `renderToStaticMarkup`.
 *
 * @param node - the root element.
 * @returns the rendered HTML.
 */
async function render(node: unknown): Promise<string> {
    let element = node as ReactElement;
    while (typeof element.type === "function") {
        const component = element.type as (props: unknown) => unknown;
        element = (await component(element.props)) as ReactElement;
    }
    return renderToStaticMarkup(element);
}

/** How many times {@link counting} has been attached to a compile - i.e. how many real compiles ran. */
let compiles = 0;

/**
 * A no-op remark plugin that counts the compiles it takes part in. Declared ONCE at module level on
 * purpose: the plugin's identity is part of the cache key, so a per-test arrow function would key
 * every render separately and every assertion below would trivially pass.
 *
 * @returns a transformer that does nothing to the tree.
 */
function counting(): (tree: unknown) => void {
    compiles += 1;
    return () => undefined;
}

/**
 * A second counting plugin, distinct from {@link counting} by identity only - used to prove two
 * different plugin sets never share a cache entry for the same source.
 *
 * @returns a transformer that does nothing to the tree.
 */
function countingToo(): (tree: unknown) => void {
    compiles += 1;
    return () => undefined;
}

describe("MdxContent caching", () => {
    it("renders the EDITED legal text, never the cached body", async () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": mdx(
                { effectiveFrom: "2026-07-07", notice: "none", changeSummary: "A change." },
                "We keep your data for twelve months.",
            ),
        });
        const policy = new Policy({ slug: "privacy", dir, locales: ["en"] });
        const before = await render(await PolicyDocument({ policy, locale: "en" }));
        expect(before).toContain("twelve months");

        rewrite(
            path.join(dir, "2026-07-07/en.mdx"),
            mdx(
                { effectiveFrom: "2026-07-07", notice: "none", changeSummary: "A change." },
                "We keep your data for six months.",
            ),
        );

        const after = await render(await PolicyDocument({ policy, locale: "en" }));
        expect(after).toContain("six months");
        expect(after).not.toContain("twelve months");
    });

    it("keeps two locales of the same revision apart", async () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": validDefault("2026-07-07"),
            "2026-07-07/nl.mdx": mdx({}, "De Nederlandse tekst."),
        });
        const policy = new Policy({ slug: "privacy", dir, locales: ["en", "nl"] });
        const english = await render(await PolicyDocument({ policy, locale: "en" }));
        const dutch = await render(await PolicyDocument({ policy, locale: "nl" }));
        expect(english).toContain("Body.");
        expect(dutch).toContain("De Nederlandse tekst.");
    });

    it("keeps two revisions of the same locale apart", async () => {
        const dir = makePolicyDir({
            "2026-07-07/en.mdx": mdx(
                { effectiveFrom: "2026-07-07", notice: "none", changeSummary: "First." },
                "The original clause.",
            ),
            "2026-08-08/en.mdx": mdx(
                { effectiveFrom: "2026-08-08", notice: "notify", changeSummary: "Second." },
                "The replacement clause.",
            ),
        });
        const policy = new Policy({ slug: "privacy", dir, locales: ["en"] });
        const old = await render(await PolicyDocument({ policy, locale: "en", revision: "2026-07-07" }));
        const current = await render(await PolicyDocument({ policy, locale: "en", revision: "2026-08-08" }));
        expect(old).toContain("The original clause.");
        expect(current).toContain("The replacement clause.");
        expect(current).not.toContain("The original clause.");
    });

    it("compiles a repeated source only once", async () => {
        const options = { mdxOptions: { remarkPlugins: [counting] } };
        const source = "# Clause 1\n\nSame body, rendered twice.\n";
        compiles = 0;
        const first = await render(await MdxContent({ source, options }));
        const second = await render(await MdxContent({ source, options }));
        expect(compiles).toBe(1);
        expect(second).toBe(first);
        expect(first).toContain("Same body, rendered twice.");
    });

    it("keeps the same source under different plugin sets apart", async () => {
        const source = "One body, two pipelines.\n";
        compiles = 0;
        await render(await MdxContent({ source, options: { mdxOptions: { remarkPlugins: [counting] } } }));
        await render(await MdxContent({ source, options: { mdxOptions: { remarkPlugins: [countingToo] } } }));
        expect(compiles).toBe(2);
    });

    it("applies the CURRENT components map on a cache hit, not the one that filled it", async () => {
        const options = { mdxOptions: { remarkPlugins: [counting] } };
        const source = "A clause.\n";
        compiles = 0;
        const components = {
            p: (props: JSX.IntrinsicElements["p"]) => <p data-consumer-paragraph>{props.children}</p>,
        };
        const first = await render(await MdxContent({ source, options, components }));
        const second = await render(await MdxContent({ source, options }));
        expect(compiles).toBe(1);
        expect(first).toContain("data-consumer-paragraph");
        expect(second).not.toContain("data-consumer-paragraph");
        expect(second).toContain("<p>A clause.</p>");
    });

    it("applies the CURRENT scope on a cache hit, not the one that filled it", async () => {
        const source = "Controller: {name}\n";
        const mdxOptions = { remarkPlugins: [counting] };
        compiles = 0;
        // `blockJS: false` keeps the `{name}` expression, which is what reads from `scope`.
        const first = await render(await MdxContent({ source, options: { mdxOptions, blockJS: false, scope: { name: "Ada" } } }));
        const second = await render(await MdxContent({ source, options: { mdxOptions, blockJS: false, scope: { name: "Grace" } } }));
        expect(compiles).toBe(1);
        expect(first).toContain("Ada");
        expect(second).toContain("Grace");
    });
});
