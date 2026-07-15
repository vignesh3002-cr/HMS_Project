import { Response } from "express";
import { AuthRequest } from "../auth/auth.middleware";
import { AppointmentService } from "./appointment.service";

const service = new AppointmentService();

export class AppointmentController {

    async createAppointment(req: AuthRequest, res: Response) {

        return res.status(201).json({
            success: true,
            message: "Appointment Controller Working"
        });

    }

}