import { Router } from "express";
import { BranchController } from "./branch.controller";
import { authenticate } from "../auth/auth.middleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

const controller = new BranchController();

router.get(
    "/getAllBranches",
    authenticate,
    authorize("ADMIN"),
    controller.getAllBranches.bind(controller)
);

router.post(
    "/",
    authenticate,
    authorize("ADMIN"),
    controller.createBranch.bind(controller)
);

export default router;