import "dotenv/config";

import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/auth/user/user.routes";
import branchRoutes from "./modules/branch/branch.routes";
import { hashPassword } from "./utils/bcrypt";
const app = express();

app.use(cors());

app.use(express.json());

app.use("/api/auth", authRoutes);
//app.use("/api/users", userRoutes);
app.use("/api/branch", branchRoutes);
app.use("/api/hashpassword", async (req, res) => {

    const { password } = req.body;

    const hashedPassword = await hashPassword(password);

    res.json({ hashedPassword });

});

const PORT = 5000;

app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

});