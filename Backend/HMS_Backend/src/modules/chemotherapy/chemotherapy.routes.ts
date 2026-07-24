import { Router } from "express";
import * as chemotherapyController from "./chemotherapy.controller";

const router = Router();

router.get("/cancer-types", chemotherapyController.getCancerTypes);

router.post("/cancer-type", chemotherapyController.addCancerType);

export default router;