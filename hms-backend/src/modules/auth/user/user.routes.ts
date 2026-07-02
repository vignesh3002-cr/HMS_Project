import { Router } from "express";
import { UserController } from "./user.controller";
import { authenticate } from "../auth.middleware";
import { authorize } from "../../../middleware/authorize";

const router = Router();

const userController = new UserController();

router.post(
    "/district-admin",
    authenticate,
    authorize("SUPER_ADMIN"),
    userController.createDistrictAdmin.bind(userController)
);

export default router;