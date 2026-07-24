import prisma from "../../config/prisma";

export const getCancerTypes = async () => {
  const cancerTypes = await prisma.chemotherapy_master.findMany({
    where: {
      deleted_flag: false,
      cancer_type: {
        not: null,
      },
    },
    select: {
      cancer_type: true,
    },
    distinct: ["cancer_type"],
    orderBy: {
      cancer_type: "asc",
    },
  });

  return cancerTypes;
};

export const addCancerType = async (data: any) => {
  const { cancer_type } = data;

  // Check duplicate cancer type
  const existing = await prisma.chemotherapy_master.findFirst({
    where: {
      cancer_type,
      deleted_flag: false,
    },
  });

  if (existing) {
    throw new Error("Cancer Type Already Exists");
  }

  // Get last chemotherapy ID
  const lastRecord = await prisma.chemotherapy_master.findFirst({
    orderBy: {
      chemo_id: "desc",
    },
    select: {
      chemo_id: true,
    },
  });

  let chemoId = "";

  if (!lastRecord) {
    // First record
    chemoId = "CHM000001";
  } else {
    // Example: CHM000025 -> 25
    const lastNumber = parseInt(
      lastRecord.chemo_id.replace("CHM", ""),
      10
    );

    const nextNumber = lastNumber + 1;

    chemoId = "CHM" + nextNumber.toString().padStart(6, "0");
  }

  // Save record
  const result = await prisma.chemotherapy_master.create({
    data: {
      chemo_id: chemoId,
      cancer_type,
    },
    select: {
      chemo_id: true,
      cancer_type: true,
    },
  });

  return result;
};