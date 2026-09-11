import { Request, Response } from "express";
import { createMedicalRecord } from "../services/record.service.js";

export const createRecord = async (
  req: Request,
  res: Response
) => {
  try {
    // Check uploaded file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Medical record file is required",
        },
      });
    }

    const {
      recordType,
      description,
      title,
      date,
      provider,
      hospital,
    } = req.body;

    // Required fields
    if (!recordType || !title || !date) {
      return res.status(400).json({
        success: false,
        error: {
          message: "recordType, title and date are required",
        },
      });
    }

    // Temporary patient ID
    // Later we'll take this directly from JWT
    const patientId = (req as any).user.userId;

    const record = await createMedicalRecord({
      patientId,
      title,
      type: recordType,
      date: new Date(date),
      provider,
      hospital,
      summary: description,

      // File processing will be added next
      encrypted: false,
    });

    return res.status(201).json({
      success: true,
      record,
      file: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error("Create record error:", error);

    return res.status(400).json({
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