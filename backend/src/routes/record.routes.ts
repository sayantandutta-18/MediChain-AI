import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";

import { authorize } from "../middleware/role.middleware.js";

import { upload } from "../middleware/upload.middleware.js";

import {
  createRecord,
  getRecords,
  getPatientRecordsForDoctor,
  getRecord,
  updateRecord,
  deleteRecord,
  downloadRecord,
  verifyRecord,
} from "../controllers/record.controller.js";

const router = Router();


// =====================================================
// CREATE MEDICAL RECORD
// POST /api/v1/records
// =====================================================

router.post(
  "/",

  (req, res, next) => {
    console.log("🔥 RECORD ROUTE HIT");

    console.log(
      "🔑 AUTH HEADER:",
      req.headers.authorization
    );

    next();
  },

  authenticate,

  (req, res, next) => {
    console.log("✅ AUTHENTICATION PASSED");
    next();
  },

  authorize("PATIENT"),

  (req, res, next) => {
    console.log("✅ AUTHORIZATION PASSED");
    next();
  },

  (req, res, next) => {
    console.log("📤 MULTER STARTING");
    next();
  },

  upload.single("file"),

  (req, res, next) => {
    console.log("✅ MULTER PASSED");
    next();
  },

  createRecord
);


// =====================================================
// GET ALL MEDICAL RECORDS
// GET /api/v1/records
// =====================================================

router.get(
  "/",
  authenticate,
  authorize("PATIENT"),
  getRecords
);


// =====================================================
// GET PATIENT MEDICAL RECORDS FOR DOCTOR
// GET /api/v1/records/patient/:patientId
// =====================================================

router.get(
  "/patient/:patientId",
  authenticate,
  authorize("DOCTOR"),
  getPatientRecordsForDoctor
);


// =====================================================
// VERIFY MEDICAL RECORD ON SUI BLOCKCHAIN
// GET /api/v1/records/:id/verify
// =====================================================

router.get(
  "/:id/verify",
  authenticate,
  authorize("PATIENT"),
  verifyRecord
);


// =====================================================
// UPDATE MEDICAL RECORD
// PUT /api/v1/records/:id
// =====================================================

router.put(
  "/:id",
  authenticate,
  authorize("PATIENT"),
  updateRecord
);


// =====================================================
// DELETE MEDICAL RECORD
// DELETE /api/v1/records/:id
// =====================================================

router.delete(
  "/:id",
  authenticate,
  authorize("PATIENT"),
  deleteRecord
);


// =====================================================
// DOWNLOAD MEDICAL RECORD
// GET /api/v1/records/:id/download
// =====================================================

router.get(
  "/:id/download",
  authenticate,
  authorize("PATIENT", "DOCTOR"),
  downloadRecord
);


// =====================================================
// GET SINGLE MEDICAL RECORD
// GET /api/v1/records/:id
// =====================================================

router.get(
  "/:id",
  authenticate,
  authorize("PATIENT"),
  getRecord
);


export default router;