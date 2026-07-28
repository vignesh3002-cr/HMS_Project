import "dotenv/config";
import { AuthService } from "./modules/auth/auth.service";

async function testLogin() {

  const authService = new AuthService();

  try {

    const result = await authService.login(
      "admin",
      "Admin@123"
    );

    console.log(result);

  } catch (error) {

    console.error(error);

  }

}

testLogin();