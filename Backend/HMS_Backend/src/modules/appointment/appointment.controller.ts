import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { AppointmentService } from "./appointment.service";

const service = new AppointmentService();

export class AppointmentController {

    async createAppointment(req: Request, res: Response) {

        try {

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.status(400).json({
                    success: false,
                    message: errors.array()[0].msg,
                    errors: errors.array()
                });

            }

            const createdBy = (req as any).user?.role || "SYSTEM";

            const appointment = await service.bookAppointment(
                req.body,
                createdBy
            );

            return res.status(201).json({
                success: true,
                message: "Appointment booked successfully",
                data: appointment
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

    async getAppointments(req: Request, res: Response) {

        try {

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.status(400).json({
                    success: false,
                    message: errors.array()[0].msg,
                    errors: errors.array()
                });

            }

            const appointments = await service.getAppointments({

                branchId: req.query.branchId as string,
                employeeId: req.query.employeeId as string,
                patientId: req.query.patientId as string,
                status: req.query.status as string,
                date: req.query.date as string,
                dateFrom: req.query.dateFrom as string,
                dateTo: req.query.dateTo as string,
                sortBy: req.query.sortBy as any,
                sortOrder: req.query.sortOrder as any,
                page: Number(req.query.page || 1),
                limit: Number(req.query.limit || 10)

            });

            return res.json({
                success: true,
                message: "Appointments fetched successfully",
                data: appointments
            });

        } catch (error: any) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }

    async getAvailableSlots(req: Request, res: Response) {

        try {

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.status(400).json({
                    success: false,
                    message: errors.array()[0].msg,
                    errors: errors.array()
                });

            }

            const slots = await service.getAvailableSlots(
                req.query.employeeId as string,
                req.query.branchId as string,
                req.query.date as string
            );

            return res.json({
                success: true,
                message: "Available slots fetched successfully",
                data: slots
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

    async getAppointmentByNumber(req: Request, res: Response) {

        try {

            const appointment = await service.getAppointmentByNumber(
                req.params.appointmentNo as string
            );

            return res.json({
                success: true,
                message: "Appointment fetched successfully",
                data: appointment
            });

        } catch (error: any) {

            return res.status(404).json({
                success: false,
                message: error.message
            });

        }

    }

    async updateAppointment(req: Request, res: Response) {

        try {

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.status(400).json({
                    success: false,
                    message: errors.array()[0].msg,
                    errors: errors.array()
                });

            }

            const appointment = await service.updateAppointment(
                req.params.appointmentNo as string,
                req.body
            );

            return res.json({
                success: true,
                message: "Appointment updated successfully",
                data: appointment
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

    async updateAppointmentStatus(req: Request, res: Response) {

        try {

            const errors = validationResult(req);

            if (!errors.isEmpty()) {

                return res.status(400).json({
                    success: false,
                    message: errors.array()[0].msg,
                    errors: errors.array()
                });

            }

            const appointment = await service.updateAppointmentStatus(
                req.params.appointmentNo as string,
                req.body.status
            );

            return res.json({
                success: true,
                message: "Appointment status updated successfully",
                data: appointment
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

    async cancelAppointment(req: Request, res: Response) {

        try {

            const appointment = await service.cancelAppointment(
                req.params.appointmentNo as string
            );

            return res.json({
                success: true,
                message: "Appointment cancelled successfully",
                data: appointment
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

}
