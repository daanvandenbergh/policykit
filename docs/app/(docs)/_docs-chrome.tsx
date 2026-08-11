// app/(docs)/_docs-chrome.tsx - the persistent, interactive docs shell (client component).
"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DocsSearchProvider, DocsNavbar, DocsNavbarButton, DocsTabs, DocsSidebar } from "@daanvandenbergh/scribekit/react";
import type { NavTree } from "@daanvandenbergh/scribekit";
import { BaseImg } from "./_docs-image";

/** The bare brand mark, sized for the navbar and the mobile drawer header. */
function LogoMark() {
    return <BaseImg src="/assets/logo-mark.svg" alt="" width={22} height={22} style={{ display: "block" }} />;
}

export function DocsChrome({ nav, children }: { nav: NavTree; children: ReactNode }) {
    const activePath = usePathname();
    return (
        <DocsSearchProvider nav={nav} linkComponent={Link}>
            <div className="scribekit-docs">
                {/* DocsNavbar renders the centered ⌘K search itself (showSearch defaults true).
                    Put your own buttons (auth, links, theme) in `actions=[...]` - not another search. */}
                {/* The logo is the bare mark on the brand ramp (no tile) - the navbar supplies its own
                    white ground. `BaseImg` so it resolves under a project-site base path. */}
                <DocsNavbar
                    logo={<LogoMark />}
                    brandName="Policykit"
                    docsText="Docs"
                    linkComponent={Link}
                    actions={[
                        <DocsNavbarButton key="github" href="https://github.com/daanvandenbergh/policykit" target="_blank" rel="noreferrer">
                            GitHub
                        </DocsNavbarButton>,
                    ]}
                />
                <DocsTabs nav={nav} activePath={activePath} linkComponent={Link} />
                <div className="scribekit-docs-body">
                    <DocsSidebar nav={nav} activePath={activePath} linkComponent={Link} brand={<LogoMark />} />
                    <main className="scribekit-docs-main">{children}</main>
                </div>
            </div>
        </DocsSearchProvider>
    );
}
