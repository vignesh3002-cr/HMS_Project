import { Router } from "express";
import { EmployeeController } from "./employee.controller";
import { authenticate } from "../../modules/auth/auth.middleware";

const router = Router();

const controller = new EmployeeController();

router.post(
    "/create",
    authenticate,
    controller.createEmployee.bind(controller)
);
router.get("/", controller.getEmployees.bind(controller));
router.get(
    "/:employeeId",
    controller.getEmployeeById.bind(controller)
);

export default router;