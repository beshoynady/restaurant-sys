// Runs once before the whole integration suite. Connects to the local MongoDB instance used
// throughout this project's development/verification workflow (server/.env MONGODB_URL) — real
// transactions require a real replica-set-enabled mongod, which is why these are integration
// tests against a real database rather than a mock.
import mongoose from "mongoose";
import dotenv from "dotenv";

export default async function globalSetup(): Promise<void> {
  dotenv.config();
  const url = process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/restaurant_test";
  await mongoose.connect(url);
  await mongoose.disconnect();
}
