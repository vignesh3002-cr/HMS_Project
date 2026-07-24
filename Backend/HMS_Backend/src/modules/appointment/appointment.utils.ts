import { DAY_OF_WEEK_NAMES } from "./appointment.constants";

export function parseDateOnly(date: string): Date {
    const [year, month, day] = date.split("-").map(Number);

    return new Date(Date.UTC(year, month - 1, day));
}

export function toDayOfWeek(date: Date): string {
    return DAY_OF_WEEK_NAMES[date.getUTCDay()];
}

export function timeStringToDate(time: string): Date {
    const [hours, minutes] = time.split(":").map(Number);

    return new Date(Date.UTC(
        1970,
        0,
        1,
        hours,
        minutes,
        0,
        0
    ));
}

export function timeToMinutes(time: Date): number {
    return time.getUTCHours() * 60 + time.getUTCMinutes();
}

export function formatTimeOfDay(time: Date): string {
    const hours = String(time.getUTCHours()).padStart(2, "0");
    const minutes = String(time.getUTCMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
}

export function timeStringToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

// Slots only include start times that leave a full consultation before end_time,
// so a shift never has a slot booked that would run past the doctor's working hours.
export function generateTimeSlots(
    startTime: Date,
    endTime: Date,
    consultationMinutes: number
): string[] {

    const slots: string[] = [];
    const step = consultationMinutes > 0 ? consultationMinutes : 30;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    for (
        let minutes = startMinutes;
        minutes + step <= endMinutes;
        minutes += step
    ) {

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        slots.push(
            `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
        );

    }

    return slots;

}