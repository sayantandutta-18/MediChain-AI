import { Router, Request, Response } from "express";
import User from "../models/user.js";

const router = Router();

router.patch("/update", async (req: Request, res: Response) => {
  try {
    const { email, walletAddress } = req.body;

    if (!email || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: "email and walletAddress are required",
      });
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Sui wallet address",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.walletAddress = walletAddress;
    await user.save();

    return res.json({
      success: true,
      message: "Wallet address updated successfully",
      walletAddress: user.walletAddress,
    });
  } catch (error) {
    console.error("Wallet update error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update wallet address",
    });
  }
});

export default router;