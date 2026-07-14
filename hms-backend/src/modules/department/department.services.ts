import {DepartmentRepository} from "./department.repository";
const departmentRepository=new DepartmentRepository();
export class DepartmentService {
    async getAllDepartments() {
        const departments = await departmentRepository.getAllDepartments();
        return departments.map((department) => ({
            department_id: department.department_id,
            department_name: department.department_name
        }));
    }
}