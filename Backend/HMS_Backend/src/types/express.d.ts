import "express";

declare global {
  namespace Express {
    interface Request {
      user: {
        role_id: string;
        username: string;
        role: string;
      };
    }
  }
}

export {};