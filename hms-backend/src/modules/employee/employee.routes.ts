import { Router } from "express";
import { EmployeeController } from "./employee.controller";

const router = Router();

const controller = new EmployeeController();

router.post(
    "/create",
    controller.createEmployee.bind(controller)
);

export default router;