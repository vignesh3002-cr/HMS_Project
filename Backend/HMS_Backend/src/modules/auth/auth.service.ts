import { AuthRepository } from "./auth.repository";
import { comparePassword } from "../../utils/bcrypt";
import { generateToken } from "../../utils/jwt";

export class AuthService {

  private authRepository = new AuthRepository();

  async login(username: string, password: string) {

    const user =
      await this.authRepository.findUserByUsername(username);

    if (!user) {
      throw new Error("Invalid username or password");
    }

    if (user.user_status !== 0) {
      throw new Error("Account is inactive");
    }

    const passwordMatched =
      await comparePassword(password, user.password!);

    if (!passwordMatched) {
      throw new Error("Invalid username or password");
    }

 const token = generateToken({
  username: user.username,
  role: user.role_type,
  hospital_id: user.branch?.hospital_id,
});

    return {
      token,
      user_details: {
        user_id: user.user_id,
        username: user.username,
        role: user.role_type,
        hospital_id: user.branch?.hospital_id,
      },
        branch: {
    branch_id: user.branch_id,
    branch_name: user.branch?.branch_name,
    branch_area: user.branch?.branch_area,
  }
    };
    
  }

}