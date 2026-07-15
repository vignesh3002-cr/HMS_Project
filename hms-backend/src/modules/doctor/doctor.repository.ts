{/*import prisma from "../../config/prisma";

export const getDoctors = async () => {
    return prisma.employees.findMany({
        where: {
            user_table: {
                role_type: "DOCTOR"
            }
        },
        include: {
            user_table: true,
            doctor_profile: true,
            doctor_schedule: true,
            branch: true,
            department_master: true
        },
        orderBy: {
            first_name: "asc"
        }
    });
};
export const getDoctorByEmployeeId = async (
    employeeId: string
) => {

    return prisma.employees.findUnique({

        where: {
            employee_id: employeeId
        },

        include: {

            user_table: true,

            doctor_profile: true,

            department_master: true,

            branch: true,

            doctor_schedule: true,

            user_branch_mapping: {
                include: {
                    branch: true
                }
            }

        }

    });

};*/}
