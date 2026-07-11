import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoURL = process.env.MONGODB_URL;

const MAX_RETRY_DELAY_MS = 30000;
const INITIAL_RETRY_DELAY_MS = 2000;

/**
 * Connects to MongoDB with capped exponential backoff on failure.
 *
 * notes:
 * - Callers must `await` this before starting to accept HTTP traffic
 *   (see server.ts) to avoid requests racing an unready connection.
 * - Retries indefinitely (a DB outage should not crash the process), but the
 *   delay is capped instead of growing unbounded.
 */
const connectDB = async (retryDelayMs = INITIAL_RETRY_DELAY_MS) => {
  try {
    console.log(`🔌 Connecting to MongoDB at ${mongoURL} ...`);

    await mongoose.connect(mongoURL, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 10000,
    });

    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error(`Retrying in ${retryDelayMs / 1000}s...`);

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));

    const nextDelay = Math.min(retryDelayMs * 2, MAX_RETRY_DELAY_MS);
    return connectDB(nextDelay);
  }
};

export default connectDB;
