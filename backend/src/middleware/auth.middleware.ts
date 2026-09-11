import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("🔐 AUTH MIDDLEWARE START");

  try {
    console.log("1. Reading authorization header");

    const authHeader = req.headers.authorization;

    console.log(
      "2. Auth header:",
      authHeader ? "PRESENT" : "MISSING"
    );

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Bearer token missing");

      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication token required",
        },
      });
    }

    console.log("3. Extracting token");

    const token = authHeader.substring(7);

    console.log(
      "4. Token:",
      token ? `${token.substring(0, 20)}...` : "EMPTY"
    );

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication token required",
        },
      });
    }

    const secret = process.env.JWT_SECRET;

    console.log(
      "5. JWT_SECRET:",
      secret ? "LOADED" : "MISSING"
    );

    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }

    console.log("6. Calling jwt.verify()");

    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("userId" in decoded) ||
      !("role" in decoded)
    ) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid authentication token",
        },
      });
    }

    console.log("7. JWT VERIFIED:", decoded);

    req.user = {
      userId: String(decoded.userId),
      role: decoded.role as
        | "PATIENT"
        | "DOCTOR"
        | "HOSPITAL"
        | "ADMIN",
    };

    console.log("8. Calling next()");

    next();
  } catch (error) {
    console.error("🔥 JWT VERIFY ERROR:", error);

    return res.status(401).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Invalid or expired token",
      },
    });
  }
};