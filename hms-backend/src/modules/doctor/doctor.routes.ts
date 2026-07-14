import { Router } from "express";

import * as DoctorController from "./doctor.controller";

const router = Router();

router.get(
    "/",
    DoctorController.getDoctors
);
router.get(
    "/:employeeId",
    DoctorController.getDoctorByEmployeeId
);

export default router;