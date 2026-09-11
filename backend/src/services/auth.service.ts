import bcrypt from "bcryptjs";
import User from "../models/user.js";
import { generateToken } from "../utils/jwt.js";

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: "PATIENT" | "DOCTOR" | "HOSPITAL" | "ADMIN";
  walletAddress?: string;
}

export const registerUser = async (data: RegisterData) => {
  const { name, email, password, role, walletAddress } = data;

  // Check if user already exists
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    walletAddress,
  });

  // Return safe user data
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    walletAddress: user.walletAddress,
    verificationStatus: user.verificationStatus,
  };
};

export const loginUser = async (
  email: string,
  password: string
) => {
  // Find user
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Compare password
  const isPasswordValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  // Generate JWT
  const token = generateToken(
    user._id.toString(),
    user.role
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress,
      verificationStatus: user.verificationStatus,
    },
  };
};