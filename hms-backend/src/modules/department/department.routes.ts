import { Router } from "express";
import { DepartmentController } from "./department.controller";

const router = Router();
const departmentController = new DepartmentController();

router.get("/test", (req, res) => {
    res.json({ message: "Department route is working" });
});

router.get(
    "/",
    departmentController.getAllDepartments.bind(departmentController)
);

router.post(
    "/",
    departmentController.createDepartment.bind(departmentController)
);

export default router;