// Runs once after the whole integration suite. Each test file manages its own connection
// lifecycle (see setup.ts) — nothing global to tear down here beyond a completion log.
export default async function globalTeardown(): Promise<void> {
  console.log("Integration suite finished.");
}
