import { Request, Response } from "express";
import {
  registerUser,
  loginUser,
} from "../services/auth.service.js";

import { registerSchema } from "../validators/auth.validator.js";

export const register = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);

    // Register user
    const user = await registerUser(validatedData);

    return res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(400).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Registration failed",
      },
    });
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Email and password are required",
        },
      });
    }

    // Login user
    const result = await loginUser(email, password);

    return res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(401).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Login failed",
      },
    });
  }
};