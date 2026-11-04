import { defineConfig } from 'vitest/config'

// Security rules tests run against their own Firestore emulator (port 8181, see
// firebase.rules-test.json), so they never touch the dev emulator's data.
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 15000,
  },
})
