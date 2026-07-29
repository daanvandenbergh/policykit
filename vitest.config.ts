import { defineConfig } from "vitest/config";

/**
 * Vitest config. Node environment (the components are server components tested via
 * `react-dom/server`, no DOM needed); JSX uses React's automatic runtime. `server-only` is
 * resolved to an empty virtual module because the real package throws when imported outside a
 * bundler's `react-server` condition (production builds keep the real guard).
 */
export default defineConfig({
    esbuild: { jsx: "automatic", jsxImportSource: "react" },
    plugins: [
        {
            name: "stub-server-only",
            enforce: "pre",
            resolveId: (id) => (id === "server-only" ? "\0server-only-stub" : null),
            load: (id) => (id === "\0server-only-stub" ? "export {}" : null),
        },
    ],
    test: {
        environment: "node",
        include: ["src/**/tests/**/*.test.{ts,tsx}"],
    },
});
