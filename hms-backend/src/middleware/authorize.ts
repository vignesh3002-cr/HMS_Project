import { Response, NextFunction } from "express";
import { AuthRequest } from "../modules/auth/auth.middleware";

export const authorize = (...roles: string[]) => {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {

    console.log("Allowed Roles:", roles);
    console.log("User:", req.user);
    console.log("User Role:", req.user?.role);
    console.log("Hospital ID:", req.user?.hospital_id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!roles.includes(req.user.role)) {
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