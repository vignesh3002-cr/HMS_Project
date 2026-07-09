import bcrypt from "bcrypt";
import prisma from "../../config/prisma";
import { BranchRepository } from "./branch.repository";
import { CreateBranchDto } from "./branch.types";

const repository = new BranchRepository();
export class BranchService {

  // ✅ Add this method for fetching all branches
  async getAllBranches() {
    try {
      const branches = await prisma.branch.findMany();
      return branches;
    } catch (error: any) {
      throw new Error(`Failed to fetch branches: ${error.message}`);
    }
  }

async createBranch(
    data: CreateBranchDto,
    createdBy: string
) {
    const branch = await repository.findBranchCode(data.branch_code);

if (branch) {
    throw new Error("Branch Code already exists");
}

    const username = await repository.findUsername(data.username);

if (username) {
    throw new Error("Username already exists");
}
const email = await repository.findEmail(data.admin_email);

if (email) {
    throw new Error("Email already exists");
}
const mobile = await repository.findMobile(data.mobile);

if (mobile) {
    throw new Error("Mobile already exists");
}
const hashedPassword = await bcrypt.hash(
    data.password,
    Number(process.env.BCRYPT_SALT_ROUNDS)
);
const result = await prisma.$transaction(async (tx) => {
    const branch = await tx.branch.create({

    data: {

        branch_name: data.branch_name,

        branch_type: "CHILD",

        email: data.email,

        address: data.address,

        city: data.city,

        state_name: data.state_name,

        branch_code: data.branch_code,

        emergency_number: data.emergency_number,

        contact_number: data.contact_number,

        country: data.country,

        pincode: data.pincode,

        license_number: data.license_number,

        branch_status: "Active",

        created_by: createdBy,

        date_of_establish: new Date(data.date_of_establish),

        medical_services: data.medical_services,

        icu_beds: data.icu_beds,

        consulation_rooms: data.consultation_rooms,

        operation_theaters: data.operation_theaters

    }

});
    const admin = await tx.global_master.create({
        data: {
            role_type: "BRANCH_ADMIN",
            created_by: createdBy,
            name: data.admin_name,
            mobile: data.mobile,
            email: data.admin_email,
            username: data.username,
            password: hashedPassword,
            status: 0,
            branch_id: branch.branch_id
        }
    });
   return {
    branch: {
        branch_id: branch.branch_id,
        branch_name: branch.branch_name,
        emergency_number: branch.emergency_number,
        contact_number: branch.contact_number,
        address: branch.address
    },
    admin: {
        role_id: admin.role_id,
        username: admin.username,
        name: admin.name
    }
};
});
return result;

}
}