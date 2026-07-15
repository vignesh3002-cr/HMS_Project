import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";

export type AuthRequest = Request & {
  user: any;
};

export const authenticate: RequestHandler = (req, res, next) => {
  const authReq = req as AuthRequest;

  try {

    const authHeader = authReq.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );
    console.log(decoded);

    authReq.user = decoded;

    next();

  } catch (error) {

    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });

  }

};