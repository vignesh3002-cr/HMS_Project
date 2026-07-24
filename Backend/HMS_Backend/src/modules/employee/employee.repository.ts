import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import {GetEmployeesQuery} from "./employee.types";

export class EmployeeRepository {

    async findUsername(username: string) {
        return prisma.user_table.findFirst({
            where: {
                username
            }
        });
    }

    async findEmail(email: string) {
        return prisma.employees.findFirst({
            where: {
                email
            }
        });
    }

    async findMobile(mobile: string) {
        return prisma.employees.findFirst({
            where: {
                mobile_no: mobile
            }
        });
    }

    async findAadhaar(aadhaar: string) {
        return prisma.employees.findFirst({
            where: {
                aadhaar_no: aadhaar
            }
        });
    }

    async findPAN(pan: string) {
        return prisma.employees.findFirst({
            where: {
                pan_no: pan
            }
        });
    }

    async findLicense(license: string) {
        return prisma.doctor_profile.findFirst({
            where: {
                license_no: license
            }
        });
    }

    async findDepartment(id: string) {
        return prisma.department_master.findUnique({
            where: {
                department_id: id
            }
        });
    }

    async findBranch(branchId: string) {
        return prisma.branch.findUnique({
            where: {
                branch_id: branchId
            }
        });
    }
    async softDeleteEmployee(employeeId: string) {
    return prisma.employees.update({
        where: {
            employee_id: employeeId
        },
        data: {
            emp_status: false
        }
    });
}
    async findEmployeeById(employeeId: string) {
    return prisma.employees.findUnique({
        where: {
            employee_id: employeeId
        },
        include: {
            user_table: {
                select: {
                    role_type: true
                }
            }
        }
    });
}

async updateEmployee(
    employeeId: string,
    data: any
) {
    return prisma.employees.update({
        where: {
            employee_id: employeeId
        },
        data
    });
}
async getAllEmployees() {
    return prisma.employees.findMany();
}
    async getEmployees(query: GetEmployeesQuery) {
            const {

        roleType,

        branchId,

        department,

        status,

        search,

        page = 1,

        limit = 10

    } = query;

    const where: Prisma.employeesWhereInput = {};
    if (department) {

    where.department_id = department;

}
if (branchId) {

    where.branch_id = branchId;
    
}
if (status !== undefined) {

    where.emp_status = status;

}
if (search) {

    where.OR = [

        {

            first_name: {

                contains: search,

                mode: "insensitive"

            }

        },

        {

            last_name: {

                contains: search,

                mode: "insensitive"

            }

        },

        {

            email: {

                contains: search,

                mode: "insensitive"

            }

        },

        {

            mobile_no: {

                contains: search,

                mode: "insensitive"

            }

        },

        {

            employee_id: {

                contains: search,

                mode: "insensitive"

            }

        }

    ];

}
if (roleType) {

    where.user_table = {

        role_type: roleType

    };

}
const employees = await prisma.employees.findMany({

    where,

    include: {

        user_table: {

            select: {

                role_type: true,

                user_status: true

            }

        },

        branch: {

            select: {

                branch_name: true,
                branch_area: true

            }

        },
        department_master: {

            select: {

                department_name: true

            }

        }

    },

    skip: (page - 1) * limit,

    take: limit,

    orderBy: {

        id: "desc"

    }

});
const total = await prisma.employees.count({

    where

});
return {

    total,

    page,

    limit,

    totalPages:

        Math.ceil(total / limit),

    employees

};
}
async getEmployeeById(

    employeeId: string

){

    const employee =
        await prisma.employees.findUnique({

            where: {

                employee_id: employeeId

            },

            include: {

                user_table: true,

                branch: true,

                    department_master: {
        select: {
            department_name: true
            }
        
        }}

        });

    if (!employee) {

        throw new Error(
            "Employee not found"
        );

    }
    const branches =
await prisma.user_branch_mapping.findMany({

    where:{

        user_id: employee.user_id!

    },

    include:{

        branch:true

    }

});
const response:any={

    employee,

    user:employee.user_table,

    branches:
        branches.map(x=>({

            branch_id:x.branch.branch_id,

            branch_name:x.branch.branch_name

        }))

};
switch(employee.user_table?.role_type){

case "DOCTOR":
    const doctorProfile =
await prisma.doctor_profile.findUnique({

    where:{

        employee_id:employeeId

    }

});
const doctorSchedules =
await prisma.doctor_schedule.findMany({

    where:{

        employee_id:employeeId,

        is_active:true

    },

    include:{

        branch:{

            select:{

                branch_name:true

            }

        }

    }

});
response.doctorProfile=
doctorProfile;

response.doctorSchedules=
doctorSchedules;

break;
}
return response;
}
}


 

