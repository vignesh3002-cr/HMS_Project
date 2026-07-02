export const generateUserId = (
    role: string,
    lastUserId?: string
): string => {

    const prefixMap: Record<string, string> = {
        SUPER_ADMIN: "SA",
        DISTRICT_ADMIN: "DA",
        BRANCH_ADMIN: "BA",
        DOCTOR: "DR",
        NURSE: "NU",
        RECEPTIONIST: "RC",
        LAB_TECH: "LT",
        PHARMACIST: "PH"
    };

    const prefix = prefixMap[role];

    if (!prefix) {
        throw new Error("Invalid Role");
    }

    let nextNumber = 1;

    if (lastUserId) {
        nextNumber = parseInt(lastUserId.substring(2)) + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(6, "0")}`;
};