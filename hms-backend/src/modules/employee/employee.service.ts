import bcrypt from "bcrypt";
import prisma from "../../config/prisma";
import { EmployeeRepository } from "./employee.repository";
import { CreateEmployeeDto } from "./employee.types";

const repository = new EmployeeRepository();

export class EmployeeService {

    async createEmployee(
        data: CreateEmployeeDto,
        createdBy: string
    ) {

        const username = await repository.findUsername(data.username);

        if (username) {
            throw new Error("Username already exists");
        }

        if (data.email) {

            const email = await repository.findEmail(data.email);

            if (email) {
                throw new Error("Email already exists");
            }

        }

        if (data.mobile_no) {

            const mobile = await repository.findMobile(data.mobile_no);

            if (mobile) {
                throw new Error("Mobile already exists");
            }

        }

        if (data.aadhaar_no) {

            const aadhaar = await repository.findAadhaar(data.aadhaar_no);

            if (aadhaar) {
                throw new Error("Aadhaar already exists");
            }

        }

        if (data.pan_no) {

            const pan = await repository.findPan(data.pan_no);

            if (pan) {
                throw new Error("PAN already exists");
            }

        }

        const branch = await repository.findBranch(data.branch_id);

        if (!branch) {
            throw new Error("Branch not found");
        }

        if (data.department_id) {

            const department = await repository.findDepartment(
                data.department_id
            );

            if (!department) {
                throw new Error("Department not found");
            }

        }

        const hashedPassword = await bcrypt.hash(
            data.password,
            Number(process.env.BCRYPT_SALT_ROUNDS)
        );
        return await prisma.$transaction(async (tx) => {

    const user = await tx.user_table.create({

        data: {

            role_type: data.role_type,

            username: data.username,

            password: hashedPassword,

            created_by: createdBy,

            branch_id: data.branch_id,

            user_status: 0

        }

    });
    const employee = await tx.employees.create({

    data: {

        user_id: user.user_id,

        first_name: data.first_name,

        middle_name: data.middle_name,

        last_name: data.last_name,

        email: data.email,

        mobile_no: data.mobile_no,

        branch_id: data.branch_id,

        department_id: data.department_id,

        designation: data.designation,

        qualification: data.qualification,

        specialization: data.specialization,

        joining_date: data.joining_date
            ? new Date(data.joining_date)
            : null,

        aadhaar_no: data.aadhaar_no,

        pan_no: data.pan_no,

        nationality: data.nationality,

        blood_group: data.blood_group,

        marital_status: data.marital_status,

        current_address: data.current_address,

        parmanant_address: data.parmanant_address,

        emergency_contact_name:
            data.emergency_contact_name,

        emergency_contact_relationship:
            data.emergency_contact_relationship,

        emergency_contact_number:
            data.emergency_contact_number,

        emp_status: true

    }

});
switch (data.role_type) {

    case "DOCTOR":

        await tx.doctor_profile.create({

            data: {

                employee_id: employee.id,

                specialization:
                    data.specialization || "",

                qualification:
                    data.qualification,

                license_no:
                    data.license_no,

                consultation_minutes:
                    data.consultation_minutes ?? 15

            }

        });

        break;

    case "RECEPTIONIST":

        await tx.receptionist_profile.create({

            data: {

                employee_id: employee.id,

                remarks:
                    data.remarks

            }

        });

        break;

    case "LAB_TECHNICIAN":

        await tx.lab_tech_profile.create({

            data: {

                employee_id: employee.id,

                certification_no:
                    data.certification_no,

                skill_notes:
                    data.skill_notes

            }

        });

        break;

}
return {

    success: true,

    message: "Employee created successfully",

    data: {

        user_id: user.user_id,

        employee_id: employee.employee_id,

        employee_name:
            employee.first_name + " " + employee.last_name,

        role_type: data.role_type,

        branch_id: employee.branch_id

    }

};

});

    }
}