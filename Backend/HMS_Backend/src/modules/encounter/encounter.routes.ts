import { Router } from "express";
import { EncounterController } from "./encounter.controller";
import { authenticate } from "../auth/auth.middleware";
import {
    createEncounterValidation,
    updateEncounterValidation,
    closeEncounterValidation,
    getEncountersValidation
} from "./encounter.validation";

const router = Router();

const controller = new EncounterController();

router.post(
    "/",
    authenticate,
    createEncounterValidation,
    controller.createEncounter.bind(controller)
);

router.get(
    "/",
    authenticate,
    getEncountersValidation,
    controller.getEncounters.bind(controller)
);

router.get(
    "/:encounterNo",
    authenticate,
    controller.getEncounterByNumber.bind(controller)
);

router.put(
    "/:encounterNo/close",
    authenticate,
    closeEncounterValidation,
    controller.closeEncounter.bind(controller)
);

router.put(
    "/:encounterNo",
    authenticate,
    updateEncounterValidation,
    controller.updateEncounter.bind(controller)
);

export default router;
