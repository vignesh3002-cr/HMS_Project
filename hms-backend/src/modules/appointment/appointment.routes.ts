import { Router } from "express";
import { AppointmentController } from "./appointment.controller";

const router = Router();

const controller = new AppointmentController();

router.post("/", controller.createAppointment);

export default router;