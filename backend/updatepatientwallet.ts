declare const process: {
  env: {
    MONGODB_URI?: string;
  };
};

import "dotenv/config";
import mongoose from "mongoose";
import User from "./src/models/user.js";

async function updateWallet() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ MongoDB connected");

    const user = await User.findOne({
      email: "uploadtest2026@test.com",
    });

    if (!user) {
      throw new Error("Patient not found");
    }

    user.walletAddress =
      "0x209426500613b0bfc4eea565ba2b94ef164bbec1c2da36e4faff51f4adad18b0";

    await user.save();

    console.log(
      "✅ Patient wallet updated:",
      user.walletAddress
    );
  } catch (error) {
    console.error("❌ Update failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
  }
}

updateWallet();