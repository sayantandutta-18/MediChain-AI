import { Request, Response } from "express";

import {
  createAccessRequest,
  getPatientAccessRequests,
  getDoctorAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  revokeAccessRequest,
} from "../services/accessRequest.service.js";

// Doctor creates access request
export const createRequest = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?.userId;
    const { patientId } = req.body;

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication required",
        },
      });
    }

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Patient ID is required",
        },
      });
    }

    const request = await createAccessRequest(
      doctorId,
      patientId
    );

    return res.status(201).json({
      success: true,
      message: "Access request created successfully",
      request,
    });
  } catch (error) {
    console.error("Create access request error:", error);

    return res.status(400).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to create access request",
      },
    });
  }
};

// Patient views received access requests
export const getPatientRequests = async (
  req: Request,
  res: Response
) => {
  try {
    const patientId = req.user?.userId;

    if (!patientId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication required",
        },
      });
    }

    const requests = await getPatientAccessRequests(patientId);

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get patient access requests error:", error);

    return res.status(400).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to get access requests",
      },
    });
  }
};

// Doctor views own access requests
export const getDoctorRequests = async (
  req: Request,
  res: Response
) => {
  try {
    const doctorId = req.user?.userId;

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication required",
        },
      });
    }

    const requests = await getDoctorAccessRequests(doctorId);

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get doctor access requests error:", error);

    return res.status(400).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to get access requests",
      },
    });
  }
};

// Patient approves request
export const approveRequest = async (
  req: Request,
  res: Response
) => {
  try {
    const patientId = req.user?.userId;
    const idParam = req.params.id;
    const requestId = Array.isArray(idParam)
      ? idParam[0]
      : idParam;

    if (!patientId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication required",
        },
      });
    }

    const expiryDays = Number(req.body.expiryDays) || 7;

    const request = await approveAccessRequest(
      requestId,
      patientId,
      expiryDays
    );

    return res.status(200).json({
      success: true,
      message: "Access request approved successfully",
      request,
    });
  } catch (error) {
    console.error("Approve access request error:", error);

    return res.status(400).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to approve access request",
      },
    });
  }
};

// Patient rejects request
export const rejectRequest = async (
  req: Request,
  res: Response
) => {
  try {
    const patientId = req.user?.userId;
    const idParam = req.params.id;
    const requestId = Array.isArray(idParam)
      ? idParam[0]
      : idParam;

    if (!patientId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication required",
        },
      });
    }

    const request = await rejectAccessRequest(
      requestId,
      patientId
    );

    return res.status(200).json({
      success: true,
      message: "Access request rejected successfully",
      request,
    });
  } catch (error) {
    console.error("Reject access request error:", error);

    return res.status(400).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to reject access request",
      },
    });
  }
};

// Patient revokes access
export const revokeRequest = async (
  req: Request,
  res: Response
) => {
  try {
    const patientId = req.user?.userId;
    const idParam = req.params.id;
    const requestId = Array.isArray(idParam)
      ? idParam[0]
      : idParam;

    if (!patientId) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Authentication required",
        },
      });
    }

    const request = await revokeAccessRequest(
      requestId,
      patientId
    );

    return res.status(200).json({
      success: true,
      message: "Access revoked successfully",
      request,
    });
  } catch (error) {
    console.error("Revoke access request error:", error);

    return res.status(400).json({
      success: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to revoke access",
      },
    });
  }
};