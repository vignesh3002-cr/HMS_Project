export const ENCOUNTER_STATUS = {
    OPEN: "OPEN",
    CLOSED: "CLOSED"
} as const;

export const ENCOUNTER_STATUS_VALUES: string[] = Object.values(ENCOUNTER_STATUS);

export const ENCOUNTER_TYPE_DEFAULT = "OPD";
