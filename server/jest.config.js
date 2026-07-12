// Jest configuration for the ESM + TypeScript backend (per BACKEND_FOUNDATION.md §5: tsx for
// dev, no build/dist step). Testing infrastructure was previously and deliberately deferred (see
// BACKEND_FOUNDATION.md) — this file establishes it now, per the explicit instruction to add
// integration tests for DATABASE_IMPLEMENTATION_PLAN.md DB-007/DB-010/DB-014.
//
// Plain `.js` (not `.ts`): Jest's own config-file loader requires `ts-node` specifically to parse
// a `.ts` config, which is a separate dependency from `ts-jest` (which handles the actual test
// *file* transformation, and is what's installed). Using `.js` here avoids that extra dependency
// for a file with no meaningful type-checking value anyway.
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.jest.json" }],
  },
  testMatch: ["**/tests/integration/**/*.test.ts"],
  testTimeout: 30000,
  // Single worker: all integration tests share one real local MongoDB instance; running files in
  // parallel workers would open many separate connections against the same replica set for no
  // benefit, and each test file already scopes its own data by a unique brand suffix for isolation.
  maxWorkers: 1,
  globalSetup: "<rootDir>/tests/integration/globalSetup.ts",
  globalTeardown: "<rootDir>/tests/integration/globalTeardown.ts",
};
