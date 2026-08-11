// app/(docs)/_docs.ts - the single configured Docs instance the routes read from.
import { Docs } from "@daanvandenbergh/scribekit";

export const docs = new Docs({
    contentDir: "./content", // folder of <slug>/en.mdx pages, resolved against the app root (process.cwd())
    basePath: "/", // the site IS the docs: pages serve at /<slug>, not /docs/<slug>. Keep in step with the route group.
    siteUrl: "https://daanvandenbergh.github.io/policykit", // GitHub Pages project-site origin
    brandName: "Policykit",
    // The site description: the index hero's subtitle AND the SEO meta description, so keep it one
    // sentence and under ~160 characters.
    description:
        "Versioned legal policies as MDX for Next.js - a directory per revision, a file per locale, and one class that answers which revision binds now.",
    // Tab and group order for a stable sidebar. Fill from the corpus front-matter (`tab` / `group`).
    tabs: ["Guide", "Reference"],
    groups: ["Start", "Author", "Integrate", "Reference"],
});
