import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "./auth.middleware";
import { authorize } from "../../middleware/authorize";


const router = Router();

const authController = new AuthController();

router.post(
    "/login",
    authController.login.bind(authController)
);
router.get(
    "/me",
    authenticate,
    (req, res) => {

        return res.json({
            success: true,
            user: (req as any).user
        });

    }
);
router.get(
  "/admin",
  authenticate,
  authorize("ADMIN"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Admin"
    });
  }
);

export default router;