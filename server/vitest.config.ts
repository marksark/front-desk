import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    env: {
      // Prevent Express from calling app.listen() when importing ../src/index (see index.ts).
      NODE_ENV: "production"
    }
  }
});
