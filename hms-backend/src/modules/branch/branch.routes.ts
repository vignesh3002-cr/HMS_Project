import { Router } from "express";
import { BranchController } from "./branch.controller";

const router = Router();

const controller = new BranchController();

// ✅ Add this ONE line for BranchSelector to work
router.get("/", controller.getAllBranches.bind(controller));

router.post(
    "/",
    controller.createBranch.bind(controller)
);

export default router;