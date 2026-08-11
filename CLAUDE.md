# Project: Policykit

Policykit is an npm typescript package for versioned legal policies (terms of service, privacy
policy, DPA, ...) as MDX in Next.js App Router apps. A version IS a directory
(`<dir>/<YYYY-MM-DD>/<locale>.mdx`); the `Policy` class answers which revision binds now, what
notice is owed, and renders any revision in any locale. It ships a rules file and a Claude Code
skill for authoring revisions.

## Directory Architecture

```
rules/
  policies.md                       # Shipped rules consumers @-import into their CLAUDE.md
skills/
  policykit/                        # The revision-authoring workflow skill (symlinked by consumers)
src/
  index.ts                          # Package root entry ("."), re-exports the policy module
  policy/                           # The react-free core: Policy class, loader, types, errors
    policy.ts                       #   Policy + noticeQueue/requiredConsentRevision/assertValidAll
    load.ts                         #   The filesystem layer: walk, grammar, frontmatter, cache
    types.ts                        #   Public types (PolicyRevision, PolicyConfig, ...)
    errors.ts                       #   PolicyValidationError
  react/                            # React subpath ("./react"): the PolicyDocument renderer
docs/                               # The published docs site (Next.js, static export -> GitHub Pages)
  app/(docs)/                       #   Routes + the single `new Docs(...)` instance in _docs.ts
  content/<slug>/en.mdx             #   One page per folder, served at /<slug> (basePath is "/")
  public/assets/                    #   The logo mark and the per-page hero JPEGs
```

The root entry's module graph imports ONLY `node:fs`, `node:path`, and `gray-matter` - never
react/next/server-only. Consumers' server-side core packages import it under architecture rules
that forbid react, and those rules cannot see through a package boundary, so the promise is
enforced at the source by `src/policy/tests/architecture.test.ts`. Keep it that way.

## The public contract stays in lockstep

Any change to the package's API, layout grammar, or frontmatter contract updates
`skills/policykit/SKILL.md`, `rules/policies.md`, the README, and the `docs/content/` pages in the
SAME change - they are the package's public contract for agents and humans, and a doc that lags the
code is part of the definition of NOT done. The imported `docs_parity` rule governs the docs site;
here it also covers the on-disk revision layout, which is user-visible, so a change to it is a
docs-affecting change.

@node_modules/@daanvandenbergh/scribekit/rules/docs_parity.md
@node_modules/@daanvandenbergh/claudekit/rules/ts_coding_standards.md
@node_modules/@daanvandenbergh/claudekit/rules/core_principles.md
@node_modules/@daanvandenbergh/claudekit/rules/workflow.md
@node_modules/@daanvandenbergh/claudekit/rules/todo.md
@node_modules/@daanvandenbergh/claudekit/rules/ts_modular_coding.md
@node_modules/@daanvandenbergh/claudekit/skills/ts/audit-tests/claude-rules.md
@node_modules/@daanvandenbergh/claudekit/rules/active_sessions.md

## Design invariants (each has a stated reason - do not relax casually)

- **No constructor IO.** `Policy` construction stores config only; a malformed policy file must
  fail at first USE (failing `next build` and `assertValid()`), never at import time.
- **The directory walk is never memoized.** `next dev` must see edits live and errors must
  re-throw on every call. Only the per-file parse is cached, keyed by `(mtimeMs, size)`.
- **Revisions stay zero-padded ISO STRINGS end to end.** Consumers store accepted revisions as
  these strings and compare with lexicographic `>=` - never convert to `Date`, never reformat.
- **`now` reduces to its UTC calendar day** (`toISOString().slice(0, 10)`) for every binding
  comparison - the pinned timezone convention.
- **Loud grammar.** Anything unexpected in a policy directory is an error naming the entry;
  the only ignored thing is `drafts/`.

## Git

- Never create new git branches unless asked; if you really feel it is needed, ask for
  permission first.
- Never rewrite git history over policy or fixture content - the log is part of the
  acceptance-evidence chain this package exists to keep.

## Maintained README.md

When making changes to the library, ensure the README.md instructions for how to use the
library are still up to date.
