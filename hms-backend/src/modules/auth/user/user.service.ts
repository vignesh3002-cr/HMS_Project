import { UserRepository } from "./user.repository";
import { CreateDistrictAdminDto } from "./user.interface";
import { hashPassword } from "../../../utils/bcrypt";
import { generateUserId } from "../../../utils/idGenerator";

export class UserService {

    private userRepository = new UserRepository();

    async createDistrictAdmin(
        data: CreateDistrictAdminDto,
        superAdminId: string
    ) {

        // Check username
        const usernameExists =
            await this.userRepository.findByUsername(data.username);

        if (usernameExists) {
            throw new Error("Username already exists");
        }

        // Check email
        const emailExists =
            await this.userRepository.findByEmail(data.email);

        if (emailExists) {
            throw new Error("Email already exists");
        }

        // Check mobile
        const mobileExists =
            await this.userRepository.findByMobile(data.mobile);

        if (mobileExists) {
            throw new Error("Mobile number already exists");
        }

        // Get last District Admin
        const lastUser =
            await this.userRepository.findLastUser("DISTRICT_ADMIN");

        // Generate ID
        const id =
            generateUserId(
                "DISTRICT_ADMIN",
                lastUser?.id
            );

        // Hash password
        const hashedPassword =
            await hashPassword(data.password);

        // Save into DB
        const user =
            await this.userRepository.create({

                id,

                role_type: "DISTRICT_ADMIN",

                parent_id: superAdminId,

                name: data.name,

                district_name: data.district_name,

                mobile: data.mobile,

                email: data.email,

                username: data.username,

                password: hashedPassword,

                status: 0

            });

        return {
            message: "District Admin Created Successfully",
            user
        };

    }

}