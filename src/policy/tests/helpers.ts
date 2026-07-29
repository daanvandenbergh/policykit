import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach } from "vitest";

/**
 * Test support: the committed fixture directories (the green paths, doubling as living
 * documentation of the layout) and a scratch-directory builder for the red paths, where
 * spelling a broken layout inline keeps each test readable as data.
 */

/** Absolute path to the committed fixtures directory. */
const FIXTURES = fileURLToPath(new URL("./fixtures/", import.meta.url));

/**
 * Resolves a committed fixture policy directory by name.
 *
 * @param name - the fixture directory name (e.g. `"terms"`).
 * @returns the absolute path.
 */
export function fixture(name: string): string {
    return path.join(FIXTURES, name);
}

/** Scratch directories created by {@link makePolicyDir}, removed after each test. */
const created: string[] = [];

afterEach(() => {
    for (const dir of created.splice(0)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

/**
 * Creates a throwaway policy directory from a `relative path -> file content` map, so a test
 * can spell an (often deliberately broken) layout inline. Removed automatically after the test.
 *
 * @param files - the files to create, keyed by path relative to the policy directory.
 * @returns the absolute path of the created directory.
 */
export function makePolicyDir(files: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "policykit-test-"));
    created.push(dir);
    for (const [rel, content] of Object.entries(files)) {
        const abs = path.join(dir, rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, content);
    }
    return dir;
}

/**
 * Builds an MDX file with the given frontmatter fields (emitted as `key: value` lines, so the
 * caller controls the exact YAML) and body.
 *
 * @param fields - the frontmatter fields; `undefined` values are omitted.
 * @param body - the MDX body. Defaults to a one-line placeholder.
 * @returns the file content.
 */
export function mdx(fields: Record<string, string | undefined>, body = "Body."): string {
    const lines = Object.entries(fields)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value}`);
    return `---\n${lines.join("\n")}\n---\n\n${body}\n`;
}

/**
 * A valid default-locale file for a revision, with optional overrides.
 *
 * @param effectiveFrom - the `effectiveFrom` value. Defaults to `2026-07-07`, matching the
 *   standard test revision date so `effectiveFrom >= revision` holds.
 * @param overrides - extra or overriding frontmatter fields.
 * @returns the file content.
 */
export function validDefault(effectiveFrom = "2026-07-07", overrides: Record<string, string | undefined> = {}): string {
    return mdx({ effectiveFrom, notice: "none", changeSummary: "A change.", ...overrides });
}
