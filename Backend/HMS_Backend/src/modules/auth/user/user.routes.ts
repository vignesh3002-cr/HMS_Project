import { Router } from "express";
import { UserController } from "./user.controller";
import { authenticate } from "../auth.middleware";
import { authorize } from "../../../middleware/authorize";

const router = Router();

const userController = new UserController();

router.post(
    "/branch_admin",
    authenticate,
    authorize("ADMIN"),
    userController.createBranchAdmin.bind(userController)
);

export default router;