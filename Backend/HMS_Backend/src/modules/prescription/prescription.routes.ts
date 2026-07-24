{/*import { Router } from "express";
import { PrescriptionController } from "./prescription.controller";
import { authenticate } from "../auth/auth.middleware";
import {
    createPrescriptionValidation,
    getPrescriptionsValidation,
    getPrescriptionByIdValidation,
    updatePrescriptionValidation,
    deletePrescriptionValidation,
    addPrescriptionItemValidation,
    updatePrescriptionItemValidation,
    deletePrescriptionItemValidation,
    getPrescriptionItemsValidation
} from "./prescription.validation";

const router = Router();

const controller = new PrescriptionController();

router.post(
    "/",
    authenticate,
    createPrescriptionValidation,
    controller.createPrescription.bind(controller)
);

router.get(
    "/",
    authenticate,
    getPrescriptionsValidation,
    controller.getPrescriptions.bind(controller)
);

router.get(
    "/:prescriptionId/items",
    authenticate,
    getPrescriptionItemsValidation,
    controller.getPrescriptionItems.bind(controller)
);

router.post(
    "/:prescriptionId/items",
    authenticate,
    addPrescriptionItemValidation,
    controller.addPrescriptionItem.bind(controller)
);

router.put(
    "/:prescriptionId/items/:itemId",
    authenticate,
    updatePrescriptionItemValidation,
    controller.updatePrescriptionItem.bind(controller)
);

router.delete(
    "/:prescriptionId/items/:itemId",
    authenticate,
    deletePrescriptionItemValidation,
    controller.deletePrescriptionItem.bind(controller)
);

router.get(
    "/:prescriptionId",
    authenticate,
    getPrescriptionByIdValidation,
    controller.getPrescriptionById.bind(controller)
);

router.put(
    "/:prescriptionId",
    authenticate,
    updatePrescriptionValidation,
    controller.updatePrescription.bind(controller)
);

router.delete(
    "/:prescriptionId",
    authenticate,
    deletePrescriptionValidation,
    controller.deletePrescription.bind(controller)
);

export default router;*/}
