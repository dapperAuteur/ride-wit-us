import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Vitest ran without a config until the first test imported a module through the
// repo's `@/*` path alias. Vitest does not read tsconfig paths, so mirror the one
// alias here rather than downgrading source files to relative imports.
export default defineConfig({
  test: {
    // Agent worktrees live under .claude/worktrees with their own copies of every test; running them
    // from the main checkout tests stale branches and reports their failures as this branch's.
    exclude: [...configDefaults.exclude, ".claude/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // `server-only` throws outside a React Server Components build. Tests import server modules
      // directly, so point it at an empty module here (and only here).
      "server-only": fileURLToPath(new URL("./lib/test/server-only-stub.ts", import.meta.url)),
    },
  },
});
