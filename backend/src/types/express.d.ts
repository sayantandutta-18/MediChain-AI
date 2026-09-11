import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: "PATIENT" | "DOCTOR" | "HOSPITAL" | "ADMIN";
      } & JwtPayload;
    }
  }
}

export {};