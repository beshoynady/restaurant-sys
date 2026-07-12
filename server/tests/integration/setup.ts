// Per-test-file connection lifecycle helper — import and call in beforeAll/afterAll.
import mongoose from "mongoose";
import dotenv from "dotenv";

export async function connectTestDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  dotenv.config();
  const url = process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/restaurant_test";
  await mongoose.connect(url);
}

export async function disconnectTestDb(): Promise<void> {
  await mongoose.disconnect();
}
