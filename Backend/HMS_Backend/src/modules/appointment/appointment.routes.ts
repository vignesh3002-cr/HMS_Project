import { Router } from "express";
import { AppointmentController } from "./appointment.controller";
import { authenticate } from "../auth/auth.middleware";
import {
    createAppointmentValidation,
    updateAppointmentValidation,
    updateAppointmentStatusValidation,
    getAppointmentsValidation,
    getAvailableSlotsValidation
} from "./appointment.validation";

const router = Router();

const controller = new AppointmentController();

router.post(
    "/",
    authenticate,
    createAppointmentValidation,
    controller.createAppointment.bind(controller)
);

router.get(
    "/",
    authenticate,
    getAppointmentsValidation,
    controller.getAppointments.bind(controller)
);

router.get(
    "/available-slots",
    authenticate,
    getAvailableSlotsValidation,
    controller.getAvailableSlots.bind(controller)
);

router.get(
    "/:appointmentNo",
    authenticate,
    controller.getAppointmentByNumber.bind(controller)
);

router.put(
    "/:appointmentNo",
    authenticate,
    updateAppointmentValidation,
    controller.updateAppointment.bind(controller)
);

router.patch(
    "/:appointmentNo/status",
    authenticate,
    updateAppointmentStatusValidation,
    controller.updateAppointmentStatus.bind(controller)
);

// Soft cancellation only - appointments are never physically deleted.
router.delete(
    "/:appointmentNo",
    authenticate,
    controller.cancelAppointment.bind(controller)
);

export default router;
