import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";



const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`\n✅ MongoDB connected: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

export default connectDB;

