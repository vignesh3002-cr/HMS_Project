import { UserRepository } from "./user.repository";
import { CreateBranchAdminDto} from "./user.interface";
import { hashPassword } from "../../../utils/bcrypt";

export class UserService {

    private userRepository = new UserRepository();

    async createBranchAdmin(
        data: CreateBranchAdminDto,
        adminId: string
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

        // Get last Branch Admin

        // Hash password
        const hashedPassword =
            await hashPassword(data.password);

        // Save into DB
        const user =
            await this.userRepository.create({


                role_type: "BRANCH_ADMIN",

                parent_id: adminId,

                name: data.name,

                branch_name: data.branch_name,

                mobile: data.mobile,

                email: data.email,

                username: data.username,

                password: hashedPassword,

                status: 0

            });

        return {
            message: "Branch Admin Created Successfully",
            user:{
                
            }
        };

    }

}