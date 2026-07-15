import { Router } from "express";
import { DepartmentController } from "./department.controller";

const router=Router();
const departmentController = new DepartmentController();

router.get(
    "/",
    departmentController.getAllDepartments.bind(departmentController)
);
export default router;