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

    if (user.status !== 0) {
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
    });

    return {
      token,
      user_details: {
        name: user.name,
        username: user.username,
        role: user.role_type,
        role_id: user.role_id,
        branch_id: user.branch_id
      },
    };
    
  }

}