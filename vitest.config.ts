import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Vitest ran without a config until the first test imported a module through the
// repo's `@/*` path alias. Vitest does not read tsconfig paths, so mirror the one
// alias here rather than downgrading source files to relative imports.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
