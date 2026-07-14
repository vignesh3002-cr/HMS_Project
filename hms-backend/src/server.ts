import "dotenv/config";

import express from "express";
import cors from "cors";
import doctorRoutes from "./modules/doctor/doctor.routes";

import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/auth/user/user.routes";
import branchRoutes from "./modules/branch/branch.routes";
import employeeRoutes from "./modules/employee/employee.routes";
import departmentRoutes from "./modules/department/department.routes";
import { hashPassword } from "./utils/bcrypt";

// Fix BigInt serialization - Prisma returns BigInt types that JSON.stringify can't handle
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

const app = express();

app.use(cors());

app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({ success: true, message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/users", userRoutes);
//app.use("/api/doctors", doctorRoutes);
app.use("/api/branch", branchRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/hashpassword", async (req, res) => {

    const { password } = req.body;

    const hashedPassword = await hashPassword(password);

    res.json({ hashedPassword });

});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

});