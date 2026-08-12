export const APPOINTMENTS = [
  {
    id: 1,
    patientName: "Rahul Kumar",
    patientCode: "PT001",
    time: "09:00 AM",
    type: "Consultation",
    status: "Confirmed",
    avatarBg: "bg-blue-50",
    avatarText: "text-blue-600",
    initials: "RK",
  },
  {
    id: 2,
    patientName: "Priya Sharma",
    patientCode: "PT002",
    time: "10:00 AM",
    type: "Follow-up",
    status: "Checked In",
    avatarBg: "bg-purple-50",
    avatarText: "text-purple-600",
    initials: "PS",
  },
  {
    id: 3,
    patientName: "Arun Kumar",
    patientCode: "PT003",
    time: "11:30 AM",
    type: "Consultation",
    status: "Confirmed",
    avatarBg: "bg-emerald-50",
    avatarText: "text-emerald-600",
    initials: "AK",
  },
  {
    id: 4,
    patientName: "Meena Raj",
    patientCode: "PT004",
    time: "01:00 PM",
    type: "Follow-up",
    status: "Checked Out",
    avatarBg: "bg-pink-50",
    avatarText: "text-pink-600",
    initials: "MR",
  },
  {
    id: 5,
    patientName: "Vikram Singh",
    patientCode: "PT005",
    time: "02:30 PM",
    type: "Consultation",
    status: "Confirmed",
    avatarBg: "bg-orange-50",
    avatarText: "text-orange-600",
    initials: "VS",
  },
];

export const AVAILABILITY = [
  {
    id: 1,
    day: "Monday",
    available: true,
    slots: "09:00 AM - 01:00 PM",
  },
  {
    id: 2,
    day: "Tuesday",
    available: true,
    slots: "09:00 AM - 01:00 PM",
  },
  {
    id: 3,
    day: "Wednesday",
    available: true,
    slots: "02:00 PM - 06:00 PM",
  },
  {
    id: 4,
    day: "Thursday",
    available: true,
    slots: "09:00 AM - 01:00 PM",
  },
  {
    id: 5,
    day: "Friday",
    available: false,
    slots: "On Leave",
  },
  {
    id: 6,
    day: "Saturday",
    available: true,
    slots: "09:00 AM - 12:00 PM",
  },
  {
    id: 7,
    day: "Sunday",
    available: false,
    slots: "Unavailable",
  },
];

export const FEEDBACK = [
  {
    id: 1,
    patientName: "Rahul Kumar",
    rating: 5,
    comment:
      "Excellent consultation. The doctor explained everything clearly.",
    date: "May 28, 2026",
    initials: "RK",
    avatarBg: "bg-blue-50",
    avatarText: "text-blue-600",
  },
  {
    id: 2,
    patientName: "Priya Sharma",
    rating: 5,
    comment:
      "Very professional and caring doctor. Highly recommended.",
    date: "May 26, 2026",
    initials: "PS",
    avatarBg: "bg-purple-50",
    avatarText: "text-purple-600",
  },
  {
    id: 3,
    patientName: "Arun Kumar",
    rating: 4,
    comment:
      "Good experience. The consultation was informative and helpful.",
    date: "May 24, 2026",
    initials: "AK",
    avatarBg: "bg-emerald-50",
    avatarText: "text-emerald-600",
  },
];

export const TREND_DATA = [
  {
    month: "Jan",
    appointments: 82,
    patients: 64,
  },
  {
    month: "Feb",
    appointments: 96,
    patients: 72,
  },
  {
    month: "Mar",
    appointments: 110,
    patients: 84,
  },
  {
    month: "Apr",
    appointments: 104,
    patients: 78,
  },
  {
    month: "May",
    appointments: 128,
    patients: 92,
  },
  {
    month: "Jun",
    appointments: 142,
    patients: 105,
  },
];