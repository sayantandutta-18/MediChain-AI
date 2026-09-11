import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";

import {
  getMyAuditLogs,
  getPatientAuditLogs,
  getDoctorAuditLogs,
  getRecordAuditLogs,
} from "../controllers/auditLog.controller.js";

const router = Router();

// Get logged-in user's own audit logs
router.get("/my", authenticate, getMyAuditLogs);

// Get audit logs of a patient
router.get(
  "/patient/:patientId",
  authenticate,
  getPatientAuditLogs
);

// Get audit logs of a doctor
router.get(
  "/doctor/:doctorId",
  authenticate,
  getDoctorAuditLogs
);

// Get audit logs of a medical record
router.get(
  "/record/:recordId",
  authenticate,
  getRecordAuditLogs
);

export default router;