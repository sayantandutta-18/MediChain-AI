import { Request, Response, NextFunction } from "express";

type UserRole = "PATIENT" | "DOCTOR" | "HOSPITAL" | "ADMIN";

export const authorize = (...allowedRoles: UserRole[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication required",
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Access denied",
        },
      });
    }

    next();
  };
};