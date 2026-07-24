{/*import * as DoctorRepository from "./doctor.repository";
import prisma from "../../config/prisma";

export const getDoctors = async () => {

    const doctors = await DoctorRepository.getDoctors();

    return doctors.map((doctor) => ({

        employee_id: doctor.employee_id,

        doctor_name:
            `${doctor.first_name} ${doctor.last_name}`,

        specialization:
            doctor.doctor_profile[0]?.specialization,

        qualification:
            doctor.doctor_profile[0]?.qualification,

        consultation_minutes:
            doctor.doctor_profile[0]?.consultation_minutes,

        department:
            doctor.department_master,

        branch_name:
            doctor.branch?.branch_name,

        mobile:
            doctor.mobile_no,

        email:
            doctor.email,

        status:
            doctor.emp_status,

        schedules:
            doctor.doctor_schedule.length
    }));
};
export const getDoctorByEmployeeId = async (
    employeeId: string
) => {

    const doctor =
        await DoctorRepository.getDoctorByEmployeeId(employeeId);

    if (!doctor) {

        throw new Error("Doctor not found");

    }

    return {

        employee: {

            employee_id: doctor.employee_id,

            first_name: doctor.first_name,

            middle_name: doctor.middle_name,

            last_name: doctor.last_name,

            email: doctor.email,

            mobile_no: doctor.mobile_no,

            department: doctor.department_master,

            designation: doctor.designation,

            qualification: doctor.qualification,

            specialization: doctor.specialization,

            joining_date: doctor.joining_date,

            status: doctor.emp_status

        },

        login: {

            user_id: doctor.user_table?.user_id,

            username: doctor.user_table?.username,

            role_type: doctor.user_table?.role_type,

            user_status: doctor.user_table?.user_status

        },

        doctor_profile: doctor.doctor_profile,

        current_branch: doctor.branch,

        assigned_branches:

            doctor.user_branch_mapping.map(mapping => ({

                branch_id:
                    mapping.branch?.branch_id,

                branch_name:
                    mapping.branch?.branch_name,

                address:
                    mapping.branch?.address

            })),

        schedules:

            doctor.doctor_schedule

    };

};
export const updateDoctor=async (
    employeeId: string,
    data: any
) => {return prisma.$transaction(async(tx)=>{
    const employee =
await tx.employees.findUnique({

    where:{
        employee_id:employeeId
    },
    include:{
        user_table:true,
        doctor_profile:true,
        doctor_schedule:true,
        branch:true
    }

});
if(!employee){
    throw new Error("Employee not found");}
    await tx.employees.update({

    where:{
        employee_id:employeeId
    },

    data:{

        first_name:data.first_name,

        last_name:data.last_name,

        email:data.email,

        mobile_no:data.mobile_no,

        department:data.department,

        designation:data.designation,

        qualification:data.qualification,

        specialization:data.specialization,

        doc_license_no:data.doc_license_no

    }

});
//nst role_type 

});}*/}
