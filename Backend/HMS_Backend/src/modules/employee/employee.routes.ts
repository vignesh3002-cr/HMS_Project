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
router.get(
    "/",
    authenticate,
    controller.getAllEmployees.bind(controller)
);
router.get(
    "/:employeeId",
    authenticate,
    controller.getEmployeeById.bind(controller)
);

router.put(
    "/:employeeId",
    authenticate,
    controller.updateEmployee.bind(controller)
);
router.delete(
    "/:employeeId",
    authenticate,
    controller.softDeleteEmployee.bind(controller)
);

export default router;