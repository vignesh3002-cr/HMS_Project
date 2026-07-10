import bcrypt from "bcrypt";
import prisma from "../../config/prisma";
import { BranchRepository } from "./branch.repository";
import { CreateBranchDto } from "./branch.types";
import { generateId } from "../../utils/idGenerator";

const repository = new BranchRepository();
export class BranchService {
        async getAllBranches(createdBy: string, hospitalId: string) {

        const branches = await repository.getAllBranches(createdBy);

        return {
            success: true,
            message: "Branches fetched successfully",
            data: {
                branches: branches.map((branch) => ({
                    branch_id: branch.branch_id,
                    branch_name: branch.branch?.branch_name,
                    branch_area: branch.branch?.branch_area,
                    branch_email: branch.branch?.branch_email,
                    branch_contact_number: branch.branch?.emergency_no
                }))
            }
        };
    }
async createBranch(
    data: CreateBranchDto,
    createdBy: string,
    hospitalId: string
) {

    const username = await repository.findUsername(data.username);

if (username) {
    throw new Error("Username already exists");
}


const hashedPassword = await bcrypt.hash(
    data.password,
    Number(process.env.BCRYPT_SALT_ROUNDS)
);
const result = await prisma.$transaction(async (tx) => {
    const branchId = await generateId(
    tx,
    "BRANCH",
);
    const userId = await generateId(
        tx,
        "USER"
    );

     const branch = await tx.branch.create({

        data: {

            branch_type: "CHILD",

            address: data.address,

            district: data.district,

            state_name: data.state_name,

            emergency_no: data.emergency_number,
            branch_pincode: data.pincode,
            branch_name: data.branch_name,
            branch_status: "Active",
            branch_email: data.email,
            gst_no: data.gst_no,
            pan_no: data.pan_no,
            branch_area:data.area,
            date_of_establish: new Date(),
            website_address: data.website_address,
            branch_license_no: data.license_number,
            total_beds: data.total_beds,
            medical_services: data.medical_services,
            branch_id: branchId,
            hospital_id: hospitalId,

    }

});
    const admin = await tx.user_table.create({
        data: {
            created_by: createdBy,
            username: data.username,
            password: hashedPassword,
            user_status: 0,
            user_id: userId,
            branch_id: branchId,
        }
    });
   return {
    branch: {
        branch_id: branch.branch_id,
        emergency_number: branch.emergency_no,
        address: branch.address,
        branch_email: branch.branch_email,
        branch_area: branch.branch_area,
    },
    admin: {
        user_id: admin.user_id,
        branch_name: branch.branch_name,
        username: admin.username,
    }
};
});
return result;

}
}