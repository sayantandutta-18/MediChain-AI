import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth.routes.js";
import recordRoutes from "./routes/record.routes.js";
import accessRequestRoutes from "./routes/accessRequest.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";

const app = express();

// Security
app.use(helmet());
app.use(cors());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 Debug: check every incoming request
app.use((req, res, next) => {
  console.log("🔥 INCOMING REQUEST:", req.method, req.url);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/records", recordRoutes);
app.use("/api/v1/access-requests", accessRequestRoutes);
app.use("/api/v1/audit-logs", auditLogRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: "Route not found",
    },
  });
});

// Global error handler
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("🔥 GLOBAL ERROR:", error);

    res.status(500).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
    });
  }
);

export default app;