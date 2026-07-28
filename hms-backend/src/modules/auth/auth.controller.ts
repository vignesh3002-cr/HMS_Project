import { Request, Response } from "express";
import { AuthService } from "./auth.service";

const authService = new AuthService();

export class AuthController {

    async login(req: Request, res: Response) {

        try {

            const { username, password } = req.body;

            const result = await authService.login(
                username,
                password
            );

            return res.status(200).json({
                success: true,
                message: "Login Successful",
                data: result
            });

        } catch (error: any) {

            return res.status(401).json({
                success: false,
                message: error.message
            });

        }

    }

}