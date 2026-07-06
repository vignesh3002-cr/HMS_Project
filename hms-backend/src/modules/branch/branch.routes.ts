import { Router } from "express";
import { BranchController } from "./branch.controller";

const router = Router();

const controller = new BranchController();

router.post(
    "/",
    controller.createBranch.bind(controller)
);

export default router;