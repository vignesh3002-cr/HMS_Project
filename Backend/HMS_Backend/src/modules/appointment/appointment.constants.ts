export const APPOINTMENT_STATUS = {
    BOOKED: "BOOKED",
    CONFIRMED: "CONFIRMED",
    CHECKED_IN: "CHECKED_IN",
    IN_CONSULTATION: "IN_CONSULTATION",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    NO_SHOW: "NO_SHOW"
} as const;

export const APPOINTMENT_STATUS_VALUES: string[] =
    Object.values(APPOINTMENT_STATUS);

// Once an appointment lands in one of these, it is closed for
// modification/rescheduling and its slot no longer blocks new bookings.
export const TERMINAL_APPOINTMENT_STATUSES: string[] = [
    APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.NO_SHOW
];

export const NON_BLOCKING_APPOINTMENT_STATUSES: string[] = [
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.NO_SHOW
];

export const DAY_OF_WEEK_NAMES = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY"
];
