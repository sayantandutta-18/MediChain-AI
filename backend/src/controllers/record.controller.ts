import { Request, Response } from "express";

import {
  createMedicalRecord,
  getMedicalRecordById,
  getMedicalRecordsByPatient,
  getMedicalRecordsForDoctor,
  updateMedicalRecord,
  deleteMedicalRecord,
} from "../services/record.service.js";

import { generateSHA256 } from "../services/hash.service.js";

import {
  encryptFile,
  decryptFile,
} from "../services/encryption.service.js";

import {
  checkDoctorPatientAccess,
} from "../services/accessControl.service.js";

import { createAuditLog } from "../services/auditLog.service.js";
import {
  storeHashOnSui,
  verifyRecordOnSui,
} from "../blockchain/sui.service.js";
import User from "../models/user.js";


// =====================================================
// CREATE MEDICAL RECORD
// =====================================================

export const createRecord = async (
  req: Request,
  res: Response
) => {
  try {
    console.log("🔥 RECORD CONTROLLER HIT");

    // Check uploaded file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Medical record file is required",
        },
      });
    }

    console.log(
      "📄 File received:",
      req.file.originalname
    );

    console.log(
      "📦 Content-Type:",
      req.headers["content-type"]
    );

    console.log("📝 Body:", req.body);

    const {
      recordType,
      description,
      title,
      date,
      provider,
      hospital,
    } = req.body;

    // =================================================
    // REQUIRED FIELDS
    // =================================================

    if (!recordType || !title || !date) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "recordType, title and date are required",
        },
      });
    }

    // =================================================
    // GET PATIENT ID FROM JWT
    // =================================================

    const patientId = (req as any).user.userId;

    console.log(
      "👤 Patient ID:",
      patientId
    );

    // =================================================
    // GET PATIENT WALLET ADDRESS
    // =================================================

    const patient = await User.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Patient account not found",
        },
      });
    }

    const patientWalletAddress = patient.walletAddress;

    if (
      !patientWalletAddress ||
      !/^0x[a-fA-F0-9]{64}$/.test(patientWalletAddress)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "A valid Sui wallet address is required before creating a blockchain-anchored medical record",
        },
      });
    }

    console.log(
      "🔗 Patient Sui Wallet:",
      patientWalletAddress
    );

    // =================================================
    // SHA-256 HASH
    // =================================================

    const fileHash = generateSHA256(
      req.file.buffer
    );

    console.log(
      "🔐 SHA-256:",
      fileHash
    );

    // =================================================
    // ENCRYPT FILE
    // =================================================

    const encrypted = encryptFile(
      req.file.buffer
    );

    console.log(
      "🔒 File encrypted successfully"
    );

    // =================================================
    // SAVE RECORD
    // =================================================

    const record = await createMedicalRecord({
      patientId,
      title,
      type: recordType,
      date: new Date(date),
      provider,
      hospital,
      summary: description,

      // Integrity hash
      fileHash,

      // Encryption data
      encryptedData:
        encrypted.encryptedData,

      iv: encrypted.iv,

      authTag:
        encrypted.authTag,

      encrypted: true,
    });

    console.log(
      "✅ Encrypted medical record created"
    );

    // =================================================
    // BLOCKCHAIN ANCHOR
    // =================================================

    let blockchainAnchor;

    try {
      blockchainAnchor = await storeHashOnSui(
        fileHash,
        record._id.toString(),
        patientWalletAddress
      );
    } catch (blockchainError) {
      console.error(
        "❌ Sui blockchain anchoring failed:",
        blockchainError
      );

      // Do not leave a MongoDB record that claims to be
      // blockchain-backed when anchoring actually failed.
      await record.deleteOne();

      try {
        await createAuditLog({
          userId: patientId,
          role: req.user!.role,
          action: "RECORD_CREATED",
          patientId: patientId,
          status: "FAILED",
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          metadata: {
            title: record.title,
            type: record.type,
            reason:
              blockchainError instanceof Error
                ? blockchainError.message
                : "Sui blockchain anchoring failed",
          },
        });
      } catch (auditError) {
        console.error(
          "⚠️ Failed to create blockchain failure audit log:",
          auditError
        );
      }

      return res.status(502).json({
        success: false,
        error: {
          message:
            blockchainError instanceof Error
              ? blockchainError.message
              : "Failed to anchor medical record on Sui blockchain",
        },
      });
    }

    record.blockchainTxDigest =
      blockchainAnchor.transactionDigest;

    record.blockchainObjectId =
      blockchainAnchor.blockchainObjectId;

    record.blockchainPackageId =
      blockchainAnchor.packageId;

    record.blockchainNetwork =
      blockchainAnchor.network;

    await record.save();

    console.log(
      "⛓️ Medical record hash anchored on Sui:",
      blockchainAnchor.transactionDigest
    );

    // =================================================
    // AUDIT LOG
    // =================================================

    await createAuditLog({
      userId: patientId,
      role: req.user!.role,
      action: "RECORD_CREATED",

      recordId: record._id.toString(),
      patientId: record.patientId.toString(),

      status: "SUCCESS",

      ipAddress: req.ip,
      userAgent: req.get("user-agent"),

      metadata: {
        title: record.title,
        type: record.type,
      },
    });


    // =================================================
    // RESPONSE
    // =================================================

    return res.status(201).json({
      success: true,

      record: {
        id: record._id,
        patientId: record.patientId,
        title: record.title,
        type: record.type,
        date: record.date,
        provider: record.provider,
        hospital: record.hospital,
        summary: record.summary,
        fileHash: record.fileHash,
        encrypted: record.encrypted,

        blockchain: {
          network: record.blockchainNetwork,
          packageId: record.blockchainPackageId,
          transactionDigest:
            record.blockchainTxDigest,
          objectId:
            record.blockchainObjectId,
        },

        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },

      file: {
        originalName:
          req.file.originalname,

        mimeType:
          req.file.mimetype,

        size:
          req.file.size,

        hash:
          fileHash,

        encrypted: true,
      },
    });

  } catch (error) {
    console.error(
      "❌ Create record error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to create medical record",
      },
    });
  }
};


// =====================================================
// GET ALL MEDICAL RECORDS
// =====================================================

export const getRecords = async (
  req: Request,
  res: Response
) => {
  try {
    console.log(
      "📋 GET ALL RECORDS CONTROLLER HIT"
    );

    // Get patient ID from JWT
    const patientId =
      (req as any).user.userId;

    console.log(
      "👤 Patient ID:",
      patientId
    );

    // Get all records belonging to patient
    const records =
      await getMedicalRecordsByPatient(
        patientId
      );

    console.log(
      `✅ ${records.length} medical record(s) found`
    );

    return res.status(200).json({
      success: true,
      count: records.length,
      records,
    });

  } catch (error) {
    console.error(
      "❌ Get records error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch medical records",
      },
    });
  }
};


// =====================================================
// GET PATIENT MEDICAL RECORDS FOR DOCTOR
// =====================================================

export const getPatientRecordsForDoctor = async (
  req: Request,
  res: Response
) => {
  try {
    console.log(
      "👨‍⚕️ DOCTOR PATIENT RECORDS CONTROLLER HIT"
    );

    // =================================================
    // GET DOCTOR ID FROM JWT
    // =================================================

    const doctorId =
      req.user?.userId;

    // =================================================
    // GET PATIENT ID FROM URL
    // =================================================

    const patientIdParam =
      req.params.patientId;

    const patientId =
      Array.isArray(patientIdParam)
        ? patientIdParam[0]
        : patientIdParam;

    // =================================================
    // CHECK AUTHENTICATION
    // =================================================

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: {
          message:
            "Authentication required",
        },
      });
    }

    // =================================================
    // CHECK PATIENT ID
    // =================================================

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "Patient ID is required",
        },
      });
    }

    console.log(
      "👨‍⚕️ Doctor ID:",
      doctorId
    );

    console.log(
      "👤 Patient ID:",
      patientId
    );

    // =================================================
    // CHECK ACCESS + GET RECORDS
    // =================================================

    const records =
      await getMedicalRecordsForDoctor(
        doctorId,
        patientId
      );

    console.log(
      `✅ ${records.length} approved medical record(s) found`
    );

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,
      count: records.length,
      patientId,
      records,
    });

  } catch (error) {
    console.error(
      "❌ Doctor patient records error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch patient medical records";

    // =================================================
    // ACCESS DENIED
    // =================================================

    if (
      message.includes(
        "does not have valid access"
      )
    ) {
      return res.status(403).json({
        success: false,
        error: {
          message:
            "You do not have approved access to this patient's records",
        },
      });
    }

    // =================================================
    // INVALID ID
    // =================================================

    if (
      message.includes(
        "Invalid doctor ID"
      ) ||
      message.includes(
        "Invalid patient ID"
      )
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message,
        },
      });
    }

    // =================================================
    // SERVER ERROR
    // =================================================

    return res.status(500).json({
      success: false,
      error: {
        message,
      },
    });
  }
};


// =====================================================
// GET SINGLE MEDICAL RECORD
// =====================================================

export const getRecord = async (
  req: Request,
  res: Response
) => {
  try {
    console.log(
      "📄 GET SINGLE RECORD CONTROLLER HIT"
    );

    // Get record ID from URL
    const idParam =
      req.params.id;

    const id =
      Array.isArray(idParam)
        ? idParam[0]
        : idParam;

    // Check record ID
    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "Record ID is required",
        },
      });
    }

    // Get patient ID from JWT
    const patientId =
      (req as any).user.userId;

    console.log(
      "👤 Patient ID:",
      patientId
    );

    console.log(
      "📄 Record ID:",
      id
    );

    // =================================================
    // FIND RECORD
    // =================================================

    const record =
      await getMedicalRecordById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          message:
            "Medical record not found",
        },
      });
    }

    console.log(
      "✅ Record found"
    );

    // =================================================
    // OWNERSHIP CHECK
    // =================================================

    if (
      record.patientId.toString() !==
      patientId
    ) {
      console.log(
        "🚫 Unauthorized record access attempt"
      );

      return res.status(403).json({
        success: false,
        error: {
          message:
            "You are not authorized to access this record",
        },
      });
    }

    console.log(
      "🔐 Ownership verified"
    );

    // =================================================
    // AUDIT LOG
    // =================================================

    await createAuditLog({
      userId: patientId,
      role: req.user!.role,
      action: "RECORD_VIEWED",

      recordId: record._id.toString(),
      patientId: record.patientId.toString(),

      status: "SUCCESS",

      ipAddress: req.ip,
      userAgent: req.get("user-agent"),

      metadata: {
        title: record.title,
        type: record.type,
      },
    });


    // =================================================
    // RETURN METADATA ONLY
    // =================================================

    return res.status(200).json({
      success: true,

      record: {
        id: record._id,
        patientId:
          record.patientId,
        title:
          record.title,
        type:
          record.type,
        date:
          record.date,
        provider:
          record.provider,
        hospital:
          record.hospital,
        summary:
          record.summary,
        fileHash:
          record.fileHash,
        encrypted:
          record.encrypted,

        blockchain: {
          network:
            record.blockchainNetwork,
          packageId:
            record.blockchainPackageId,
          transactionDigest:
            record.blockchainTxDigest,
          objectId:
            record.blockchainObjectId,
        },

        createdAt:
          record.createdAt,
        updatedAt:
          record.updatedAt,
      },
    });

  } catch (error) {
    console.error(
      "❌ Get single record error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch medical record",
      },
    });
  }
};


// =====================================================
// UPDATE MEDICAL RECORD
// =====================================================

export const updateRecord = async (
  req: Request,
  res: Response
) => {
  try {
    console.log(
      "✏️ UPDATE MEDICAL RECORD CONTROLLER HIT"
    );

    // Get record ID from URL
    const idParam =
      req.params.id;

    const id =
      Array.isArray(idParam)
        ? idParam[0]
        : idParam;

    // Check record ID
    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "Record ID is required",
        },
      });
    }

    // Get patient ID from JWT
    const patientId =
      (req as any).user.userId;

    console.log(
      "👤 Patient ID:",
      patientId
    );

    console.log(
      "📄 Record ID:",
      id
    );

    // =================================================
    // GET UPDATE DATA
    // =================================================

    const {
      title,
      type,
      date,
      provider,
      hospital,
      summary,
    } = req.body ?? {};

    const updateData: {
      title?: string;
      type?: string;
      date?: Date;
      provider?: string;
      hospital?: string;
      summary?: string;
    } = {};

    if (title !== undefined) {
      updateData.title =
        title;
    }

    if (type !== undefined) {
      updateData.type =
        type;
    }

    if (date !== undefined) {
      updateData.date =
        new Date(date);
    }

    if (provider !== undefined) {
      updateData.provider =
        provider;
    }

    if (hospital !== undefined) {
      updateData.hospital =
        hospital;
    }

    if (summary !== undefined) {
      updateData.summary =
        summary;
    }

    // Check if anything was provided
    if (
      Object.keys(updateData).length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "No fields provided for update",
        },
      });
    }

    // =================================================
    // UPDATE RECORD
    // =================================================

    const record =
      await updateMedicalRecord(
        id,
        patientId,
        updateData
      );

    // Record not found / not owned
    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          message:
            "Medical record not found",
        },
      });
    }

    console.log(
      "✅ Medical record updated"
    );

    // =================================================
    // AUDIT LOG
    // =================================================

    await createAuditLog({
      userId: patientId,
      role: req.user!.role,
      action: "RECORD_UPDATED",

      recordId: record._id.toString(),
      patientId: record.patientId.toString(),

      status: "SUCCESS",

      ipAddress: req.ip,
      userAgent: req.get("user-agent"),

      metadata: {
        title: record.title,
        type: record.type,
        updatedFields: Object.keys(updateData),
      },
    });


    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,
      message:
        "Medical record updated successfully",

      record: {
        id: record._id,
        patientId:
          record.patientId,
        title:
          record.title,
        type:
          record.type,
        date:
          record.date,
        provider:
          record.provider,
        hospital:
          record.hospital,
        summary:
          record.summary,
        fileHash:
          record.fileHash,
        encrypted:
          record.encrypted,

        blockchain: {
          network:
            record.blockchainNetwork,
          packageId:
            record.blockchainPackageId,
          transactionDigest:
            record.blockchainTxDigest,
          objectId:
            record.blockchainObjectId,
        },

        createdAt:
          record.createdAt,
        updatedAt:
          record.updatedAt,
      },
    });

  } catch (error) {
    console.error(
      "❌ Update record error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to update medical record",
      },
    });
  }
};


// =====================================================
// DELETE MEDICAL RECORD
// =====================================================

export const deleteRecord = async (
  req: Request,
  res: Response
) => {
  try {
    console.log(
      "🗑️ DELETE MEDICAL RECORD CONTROLLER HIT"
    );

    // Get record ID from URL
    const idParam =
      req.params.id;

    const id =
      Array.isArray(idParam)
        ? idParam[0]
        : idParam;

    // Check record ID
    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "Record ID is required",
        },
      });
    }

    // Get patient ID from JWT
    const patientId =
      (req as any).user.userId;

    console.log(
      "👤 Patient ID:",
      patientId
    );

    console.log(
      "📄 Record ID:",
      id
    );

    // =================================================
    // DELETE RECORD
    // =================================================

    const record =
      await deleteMedicalRecord(
        id,
        patientId
      );

    // Record not found / not owned
    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          message:
            "Medical record not found",
        },
      });
    }

    console.log(
      "✅ Medical record deleted successfully"
    );

    // =================================================
    // AUDIT LOG
    // =================================================

    await createAuditLog({
      userId: patientId,
      role: req.user!.role,
      action: "RECORD_DELETED",

      recordId: record._id.toString(),
      patientId: record.patientId.toString(),

      status: "SUCCESS",

      ipAddress: req.ip,
      userAgent: req.get("user-agent"),

      metadata: {
        title: record.title,
        type: record.type,
      },
    });


    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,
      message:
        "Medical record deleted successfully",

      record: {
        id: record._id,
        patientId:
          record.patientId,
        title:
          record.title,
        type:
          record.type,
        date:
          record.date,
        fileHash:
          record.fileHash,
        encrypted:
          record.encrypted,

        blockchain: {
          network:
            record.blockchainNetwork,
          packageId:
            record.blockchainPackageId,
          transactionDigest:
            record.blockchainTxDigest,
          objectId:
            record.blockchainObjectId,
        },
      },
    });

  } catch (error) {
    console.error(
      "❌ Delete record error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete medical record",
      },
    });
  }
};


// =====================================================
// DOWNLOAD / DECRYPT MEDICAL RECORD
// PATIENT OR APPROVED DOCTOR
// =====================================================

export const downloadRecord = async (
  req: Request,
  res: Response
) => {
  try {
    console.log(
      "📥 DOWNLOAD RECORD CONTROLLER HIT"
    );

    // =================================================
    // GET RECORD ID
    // =================================================

    const idParam =
      req.params.id;

    const id =
      Array.isArray(idParam)
        ? idParam[0]
        : idParam;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "Record ID is required",
        },
      });
    }

    // =================================================
    // GET AUTHENTICATED USER
    // =================================================

    const userId =
      req.user?.userId;

    const role =
      req.user?.role;

    if (!userId || !role) {
      return res.status(401).json({
        success: false,
        error: {
          message:
            "Authentication required",
        },
      });
    }

    console.log(
      "👤 Requesting User:",
      userId
    );

    console.log(
      "🔑 Role:",
      role
    );

    console.log(
      "📄 Record ID:",
      id
    );

    // =================================================
    // FIND RECORD
    // =================================================

    const record =
      await getMedicalRecordById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          message:
            "Medical record not found",
        },
      });
    }

    console.log(
      "✅ Record found"
    );

    const recordPatientId =
      record.patientId.toString();

    // =================================================
    // ACCESS CONTROL
    // =================================================

    // -------------------------------------------------
    // PATIENT ACCESS
    // -------------------------------------------------

    if (role === "PATIENT") {

      if (
        recordPatientId !==
        userId
      ) {
        console.log(
          "🚫 Patient tried to access another patient's record"
        );

        return res.status(403).json({
          success: false,
          error: {
            message:
              "You are not authorized to access this record",
          },
        });
      }

      console.log(
        "🔐 Patient ownership verified"
      );
    }

    // -------------------------------------------------
    // DOCTOR ACCESS
    // -------------------------------------------------

    else if (role === "DOCTOR") {

      console.log(
        "👨‍⚕️ Checking doctor-patient access..."
      );

      const hasAccess =
        await checkDoctorPatientAccess(
          userId,
          recordPatientId
        );

      if (!hasAccess) {
        console.log(
          "🚫 Doctor does not have approved access"
        );

        return res.status(403).json({
          success: false,
          error: {
            message:
              "You do not have approved access to this patient's records",
          },
        });
      }

      console.log(
        "🔐 Doctor approved access verified"
      );
    }

    // -------------------------------------------------
    // OTHER ROLES
    // -------------------------------------------------

    else {
      console.log(
        "🚫 Unauthorized role attempted download:",
        role
      );

      return res.status(403).json({
        success: false,
        error: {
          message:
            "Your role is not authorized to download medical records",
        },
      });
    }

    // =================================================
    // CHECK ENCRYPTED DATA
    // =================================================

    if (
      !record.encryptedData ||
      !record.iv ||
      !record.authTag
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "Encrypted file data is missing",
        },
      });
    }

    // =================================================
    // DECRYPT FILE
    // =================================================

    const decryptedFile =
      decryptFile(
        record.encryptedData,
        record.iv,
        record.authTag
      );

    console.log(
      "🔓 File decrypted successfully"
    );

    // =================================================
    // AUDIT LOG
    // =================================================

    await createAuditLog({
      userId,
      role,
      action: "RECORD_DOWNLOADED",

      recordId: record._id.toString(),
      patientId: record.patientId.toString(),

      ...(role === "DOCTOR" && {
        doctorId: userId,
      }),

      status: "SUCCESS",

      ipAddress: req.ip,
      userAgent: req.get("user-agent"),

      metadata: {
        title: record.title,
        type: record.type,
      },
    });


    // =================================================
    // SEND FILE
    // =================================================

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="medical-record-${record._id}.pdf"`
    );

    res.setHeader(
      "Content-Length",
      decryptedFile.length.toString()
    );

    return res
      .status(200)
      .send(decryptedFile);

  } catch (error) {
    console.error(
      "❌ Download record error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to download medical record";

    // =================================================
    // INVALID ID
    // =================================================

    if (
      message.includes(
        "Invalid doctor ID"
      ) ||
      message.includes(
        "Invalid patient ID"
      ) ||
      message.includes(
        "Invalid medical record ID"
      )
    ) {
      return res.status(400).json({
        success: false,
        error: {
          message,
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        message,
      },
    });
  }
};

// =====================================================
// VERIFY MEDICAL RECORD ON SUI BLOCKCHAIN
// =====================================================

export const verifyRecord = async (
  req: Request,
  res: Response
) => {
  try {
    console.log("🔍 VERIFY BLOCKCHAIN RECORD CONTROLLER HIT");

    const idParam = req.params.id;

    const id = Array.isArray(idParam)
      ? idParam[0]
      : idParam;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Record ID is required",
        },
      });
    }

    // Get authenticated patient
    const patientId = req.user?.userId;

    if (!patientId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication required",
        },
      });
    }

    // Find record
    const record = await getMedicalRecordById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Medical record not found",
        },
      });
    }

    // Ownership check
    if (record.patientId.toString() !== patientId) {
      return res.status(403).json({
        success: false,
        error: {
          message:
            "You are not authorized to verify this record",
        },
      });
    }

    // Blockchain data check
    if (!record.blockchainTxDigest) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "This medical record is not anchored on the blockchain",
        },
      });
    }

    if (!record.fileHash) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Medical record hash is missing",
        },
      });
    }

    console.log(
      "🔗 Transaction:",
      record.blockchainTxDigest
    );

    console.log(
      "🔐 Expected Hash:",
      record.fileHash
    );

    // Verify transaction on Sui
    const blockchainVerification =
      await verifyRecordOnSui(
        record.blockchainTxDigest,
        record.fileHash
      );

    // Audit
    await createAuditLog({
      userId: patientId,
      role: req.user!.role,
      action: "RECORD_VIEWED",
      recordId: record._id.toString(),
      patientId: record.patientId.toString(),
      status: blockchainVerification.verified
        ? "SUCCESS"
        : "FAILED",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: {
        verification: true,
        transactionDigest:
          record.blockchainTxDigest,
        fileHash: record.fileHash,
        verified:
          blockchainVerification.verified,
      },
    });

    // Response
    return res.status(200).json({
      success: true,

      verification: {
        verified:
          blockchainVerification.verified,

        status:
          blockchainVerification.verified
            ? "VERIFIED"
            : "TAMPERED",

        recordId:
          record._id.toString(),

        recordHash:
          record.fileHash,

        transactionDigest:
          record.blockchainTxDigest,

        packageId:
          record.blockchainPackageId,

        network:
          record.blockchainNetwork,

        message:
          blockchainVerification.verified
            ? "Medical record blockchain transaction verified successfully"
            : "Medical record blockchain verification failed",
      },
    });
  } catch (error) {
    console.error(
      "❌ Blockchain verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to verify medical record on blockchain",
      },
    });
  }
};