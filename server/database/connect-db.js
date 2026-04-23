import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoURL = process.env.MONGODB_URL;

const connectDB = async () => {
  try {
    console.log(`🔌 Connecting to MongoDB at ${mongoURL} ...`);

    await mongoose.connect(mongoURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, 
      connectTimeoutMS: 10000, 
    });

    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    setTimeout(connectDB, 5000);
  }
};

export default connectDB;
