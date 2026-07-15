import { RequestHandler } from "express";
import { AuthRequest } from "../modules/auth/auth.middleware";

export const authorize = (...roles: string[]): RequestHandler => {
  return (req, res, next) => {
    const authReq = req as AuthRequest;

    console.log("Allowed Roles:", roles);
    console.log("User:", authReq.user);
    console.log("User Role:", authReq.user?.role);
    console.log("Hospital ID:", authReq.user?.hospital_id);

    if (!authReq.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!roles.includes(authReq.user.role)) {
      console.log("Role Not Matched");

      return res.status(403).json({
        success: false,
        message: "Forbidden. You don't have permission.",
      });
    }

    console.log("Role Matched");

    next();
  };
};