import { Router } from "express";

import {
  register,
  login,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Authenticated user
router.get("/me", authenticate, (req: any, res) => {
  res.json({
    success: true,
    message: "You are authenticated",
    user: req.user,
  });
});

// Doctor only route
router.get(
  "/doctor-test",
  authenticate,
  authorize("DOCTOR"),
  (req: any, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome Doctor",
      user: req.user,
    });
  }
);

export default router;