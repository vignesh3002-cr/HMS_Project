import { Router } from "express";
import { PatientController } from "./patient.controller";
import { authenticate } from "../auth/auth.middleware";
import {
    createPatientValidation,
    updatePatientValidation
} from "./patient.validation";

const router = Router();

const controller = new PatientController();

router.post(
    "/create",
    authenticate,
    createPatientValidation,
    controller.createPatient.bind(controller)
);

router.get("/", controller.getPatients.bind(controller));

router.get(
    "/:patientId",
    controller.getPatientById.bind(controller)
);

router.put(
    "/:patientId",
    authenticate,
    updatePatientValidation,
    controller.updatePatient.bind(controller)
);

export default router;
