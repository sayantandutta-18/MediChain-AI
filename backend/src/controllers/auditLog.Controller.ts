import { Request, Response } from "express";
import {
  getAuditLogsByUser,
  getAuditLogsByPatient,
  getAuditLogsByDoctor,
  getAuditLogsByRecord,
} from "../services/auditLog.service.js";

// Get my own audit logs
export const getMyAuditLogs = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const logs = await getAuditLogsByUser(req.user.userId);

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get patient audit logs
export const getPatientAuditLogs = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      req.user.role !== "PATIENT" &&
      req.user.role !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const patientId = String(req.params.patientId);

    if (
      req.user.role === "PATIENT" &&
      req.user.userId !== patientId
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own audit logs",
      });
    }

    const logs = await getAuditLogsByPatient(patientId);

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get doctor audit logs
export const getDoctorAuditLogs = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      req.user.role !== "DOCTOR" &&
      req.user.role !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const doctorId = String(req.params.doctorId);

    if (
      req.user.role === "DOCTOR" &&
      req.user.userId !== doctorId
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own audit logs",
      });
    }

    const logs = await getAuditLogsByDoctor(doctorId);

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get medical record audit logs
export const getRecordAuditLogs = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const recordId = String(req.params.recordId);

    const logs = await getAuditLogsByRecord(recordId);

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};