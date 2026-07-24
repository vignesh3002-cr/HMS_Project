import bcrypt from "bcrypt";
import prisma from "../../config/prisma";
import { EmployeeRepository } from "./employee.repository";
import { CreateEmployeeDto,GetEmployeesQuery } from "./employee.types";
import { generateId } from "../../utils/idGenerator";

const repository = new EmployeeRepository();
let employeeId: string;

export class EmployeeService {
    async createEmployee(
    data: CreateEmployeeDto,
    createdBy: string
) {
    const username = await repository.findUsername(data.username);

if (username) {
    throw new Error("Username already exists");
}

const email = await repository.findEmail(data.email);

if (email) {
    throw new Error("Email already exists");
}

const mobile = await repository.findMobile(data.mobile_no);

if (mobile) {
    throw new Error("Mobile already exists");
}
if (data.aadhaar_no) {

    const aadhaar = await repository.findAadhaar(data.aadhaar_no);

    if (aadhaar) {
        throw new Error("Aadhaar already exists");
    }

}
if (data.pan_no) {

    const pan = await repository.findPAN(data.pan_no);

    if (pan) {
        throw new Error("PAN already exists");
    }

}
const department = await repository.findDepartment(
    data.department_id
);

if (!department) {

    throw new Error("Department not found");

}
for (const branchId of data.branch_ids) {

    const branch = await repository.findBranch(branchId);

    if (!branch) {

        throw new Error(`Branch ${branchId} not found`);

    }

}
if (
    data.role_type === "DOCTOR" &&
    data.doc_license_no
) {

    const license = await repository.findLicense(
        data.doc_license_no
    );

    if (license) {

        throw new Error("Doctor License already exists");

    }

}
const hashedPassword = await bcrypt.hash(
    data.password,
    Number(process.env.BCRYPT_SALT_ROUNDS)
);
return await prisma.$transaction(async (tx) => {
    const userId = await generateId(
    tx,
    "USER"
);
const user = await tx.user_table.create({

    data: {

        user_id: userId,

        username: data.username,

        password: hashedPassword,

        role_type: data.role_type,

        created_by: createdBy,

        user_status: 0

    }

});
if(data.role_type === "DOCTOR"){
    employeeId = await generateId(
    tx,
    "DOCTOR"
);
}else{
    employeeId = await generateId(
    tx,
    "EMPLOYEE"
);
}

const employee = await tx.employees.create({

    data: {

        employee_id: employeeId,

        user_id: user.user_id,

        branch_id: data.branch_ids[0],

        first_name: data.first_name,

        middle_name: data.middle_name,

        last_name: data.last_name,

        email: data.email,

        mobile_no: data.mobile_no,

        blood_group: data.blood_group,

        nationality: data.nationality,

        marital_status: data.marital_status,

        aadhaar_no: data.aadhaar_no,

        pan_no: data.pan_no,

        passport_no: data.passport_no,

        parmanant_address: data.permanent_address,

        current_address: data.current_address,

        emergency_contact_name: data.emergency_contact_name,

        emergency_contact_relationship:
            data.emergency_contact_relationship,

        emergency_contact_number:
            data.emergency_contact_number,

        department_id: data.department_id,

        designation: data.designation,

        joining_date: new Date(data.joining_date),

        emp_status: true,
        employee_photo_URL: data.employee_photo_URL,
        employee_state: data.employee_state,
        employee_district: data.employee_district,
        employee_area: data.employee_area,
        employee_pincode: data.employee_pincode,
        employee_no_experence: data.employee_no_experence

    }

});
for (const branchId of data.branch_ids) {

    await tx.user_branch_mapping.create({

        data: {

            user_id: user.user_id!,

            branch_id: branchId,
            employee_id: employeeId,

            status: 1

        }

    });

}
if (data.role_type === "DOCTOR") {

    await tx.doctor_profile.create({

        data: {

            employee_id: employee.employee_id!,

            specialization: data.specialization,

            qualification: data.qualification,

            license_no: data.doc_license_no,

            consultation_minutes:
                data.consultation_minutes ?? 20

        }

    });

}
for (const schedule of data.working_hours ?? []) {

    await tx.doctor_schedule.create({

        data: {

            employee_id: employee.employee_id!,

            branch_id: schedule.branch_id,

            day_of_week: schedule.day_of_week,

            shift_name: schedule.shift_name,

            start_time: new Date(
                `1970-01-01T${schedule.start_time}:00`
            ),

            end_time: new Date(
                `1970-01-01T${schedule.end_time}:00`
            ),

            consultation_minutes:
                data.consultation_minutes ?? 20,

            is_active: true

        }

    });

}
return {

    user:{
        user_username: user.username,
        user_id: user.user_id,
        role_type: user.role_type,
        user_status: user.user_status,
    },

    employee:{
        employee_id: employee.employee_id,
        first_name: employee.first_name,
        middle_name: employee.middle_name,
    }
    
};

});

}


async updateEmployee(
    employeeId: string,
    data: CreateEmployeeDto
) {

    const employee = await repository.findEmployeeById(employeeId);

    if (!employee) {
        throw new Error("Employee not found");
    }

    const department = await repository.findDepartment(
        data.department_id
    );

    if (!department) {
        throw new Error("Department not found");
    }

    const updatedEmployee = await repository.updateEmployee(
        employeeId,
        {
            first_name: data.first_name,
            middle_name: data.middle_name,
            last_name: data.last_name,
            email: data.email,
            mobile_no: data.mobile_no,
            blood_group: data.blood_group,
            nationality: data.nationality,
            marital_status: data.marital_status,
            aadhaar_no: data.aadhaar_no,
            pan_no: data.pan_no,
            passport_no: data.passport_no,
            parmanant_address: data.permanent_address,
            current_address: data.current_address,
            emergency_contact_name: data.emergency_contact_name,
            emergency_contact_relationship: data.emergency_contact_relationship,
            emergency_contact_number: data.emergency_contact_number,
            department_id: data.department_id,
            designation: data.designation,
            joining_date: new Date(data.joining_date),
            emp_status: data.emp_status,
            employee_photo_URL: data.employee_photo_URL,
            employee_state: data.employee_state,
            employee_district: data.employee_district,
            employee_area: data.employee_area,
            employee_pincode: data.employee_pincode,
            employee_no_experence: data.employee_no_experence
        }
    );

    return {
        employee_id: updatedEmployee.employee_id,
        first_name: updatedEmployee.first_name,
        middle_name: updatedEmployee.middle_name,
        last_name: updatedEmployee.last_name,
        email: updatedEmployee.email
    };
}
async getAllEmployees() {
    return repository.getAllEmployees();
}
async softDeleteEmployee(employeeId: string) {

    const employee = await repository.findEmployeeById(employeeId);

    if (!employee) {
        throw new Error("Employee not found");
    }

    await repository.softDeleteEmployee(employeeId);

    return {
        message: "Employee deactivated successfully"
    };
}
async getEmployees (

    query: GetEmployeesQuery

) {

    return repository.getEmployees(query);

};
 async getEmployeeById(

    employeeId: string

){

    return repository.getEmployeeById(
        employeeId
    );

};

}

