import { Request, Response } from "express";
import { UserService } from "./user.service";
import { AuthRequest } from "../auth.middleware";

const userService = new UserService();

export class UserController {

    async createBranchAdmin(
        req: AuthRequest,
        res: Response
    ) {

        try {

            const result = await userService.createBranchAdmin(
                req.body,
                req.user.id
            );

            return res.status(201).json({
                success: true,
                message: result.message,
                data: result.user
            });

        } catch (error: any) {

            return res.status(400).json({
                success: false,
                message: error.message
            });

        }

    }

}