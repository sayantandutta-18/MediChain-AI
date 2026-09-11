import { Router } from "express";

import {
  createRequest,
  getPatientRequests,
  getDoctorRequests,
  approveRequest,
  rejectRequest,
  revokeRequest,
} from "../controllers/accessRequest.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

// Doctor requests access
router.post(
  "/",
  authenticate,
  authorize("DOCTOR"),
  createRequest
);

// Patient views access requests
router.get(
  "/patient",
  authenticate,
  authorize("PATIENT"),
  getPatientRequests
);

// Doctor views own requests
router.get(
  "/doctor",
  authenticate,
  authorize("DOCTOR"),
  getDoctorRequests
);

// Patient approves request
router.patch(
  "/:id/approve",
  authenticate,
  authorize("PATIENT"),
  approveRequest
);

// Patient rejects request
router.patch(
  "/:id/reject",
  authenticate,
  authorize("PATIENT"),
  rejectRequest
);

// Patient revokes access
router.patch(
  "/:id/revoke",
  authenticate,
  authorize("PATIENT"),
  revokeRequest
);

export default router;