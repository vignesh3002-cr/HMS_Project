import { Router } from "express";
import { BranchController } from "./branch.controller";
import { updateBranchValidation } from "./branch.validation";

const router = Router();

const controller = new BranchController();

// ✅ Add this ONE line for BranchSelector to work
router.get("/", controller.getAllBranches.bind(controller));

router.get(
    "/:branchId",
    controller.getBranchById.bind(controller)
);

router.post(
    "/",
    controller.createBranch.bind(controller)
);
router.put(
    "/:branchId",
    updateBranchValidation,
    controller.updateBranch.bind(controller)
);
router.delete(
    "/:branchId",
    controller.deleteBranch.bind(controller)
);

export default router;