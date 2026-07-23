import { useState, useEffect, useRef, useMemo } from "react";
import { Stethoscope, UserRound, Users, Calendar as CalendarIcon, FileText, Receipt, Loader2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import HmsTable from "@/components/hms/HmsTable";
import { format, isToday, isTomorrow, isYesterday, addDays, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker from "@/components/hms/Calender";
import { FilterPopover, useFilterPanel } from "@/components/Filter";
import type { FilterField } from "@/components/Filter/types";
import { filterDataByValues } from "@/components/Filter/utils";
import { useToast } from "@/hooks/use-toast";
import { employeeApi, type EmployeeRecord } from "@/api/employee.api";
import { patientApi } from "@/api/patient.api";



const appointments = [
  {
    id: 1,
    appointmentNo: "APT-9042",
    patientName: "Divakar",
    patientId: "PTN-9042",
    avatar: "D",
    avatarColor: "#00488D",
    avatarBg: "#D6E3FF",
    doctorName: "Dr. Sarah Jenkins",
    doctorId: "DOC-442",
    doctorAvatar: "SJ",
    doctorAvatarcolor: "#FF6B35",
    doctorAvatarBg: "#ff6b351f",
    reason: "General Check-Up",
    date: "12-12-2026",
    time: "10:00 AM",
    status: "Active",
  },
  {
    id: 2,
    appointmentNo: "APT-2219",
    patientName: "Bharath",
    patientId: "PTN-2219",
    avatar: "B",
    avatarColor: "#7B3200",
    avatarBg: "#FFDBCB",
    doctorName: "Dr. Robert Lee",
    doctorId: "DOC-2210",
    doctorAvatar: "RL",
    doctorAvatarcolor: "#475C7F",
    doctorAvatarBg: "#E6E8EA",
    reason: "Initial Diagnosis",
    date: "12-12-2026",
    time: "11:20 AM",
    status: "Leave",
  },
  {
    id: 3,
    appointmentNo: "APT-4431",
    patientName: "Babu",
    patientId: "PTN-4431",
    avatar: "B",
    avatarColor: "#00C896",
    avatarBg: "rgba(0,200,150,0.12)",
    doctorName: "Dr.Marcus Kincaid",
    doctorId: "DOC-4431",
    doctorAvatar: "MK",
    doctorAvatarcolor: "#00488D",
    doctorAvatarBg: "#D6E3FF",
    reason: "Follow-Up Visit",
    date: "12-12-2026",
    time: "12:30 PM",
    status: "Active",
  },
  {
    id: 4,
    appointmentNo: "APT-2219",
    patientName: "Govindan",
    patientId: "PTN-2219",
    avatar: "G",
    avatarColor: "#475C7F",
    avatarBg: "#E6E8EA",
    doctorName: "Dr. Robert Lee",
    doctorId: "DOC-2210",
    doctorAvatar: "RL",
    doctorAvatarcolor: "#475C7F",
    doctorAvatarBg: "#E6E8EA",
    reason: "Initial Diagnosis",
    date: "12-12-2026",
    time: "01:15 PM",
    status: "Active",
  },
];

const navItems = [
  {
    label: "Dashboard",
    active: true,
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7.5 4.5V0H13.5V4.5H7.5ZM0 7.5V0H6V7.5H0ZM7.5 13.5V6H13.5V13.5H7.5ZM0 13.5V9H6V13.5H0ZM1.5 6H4.5V1.5H1.5V6ZM9 12H12V7.5H9V12ZM9 3H12V1.5H9V3ZM1.5 12H4.5V10.5H1.5V12Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: "Staff",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M8.25 0C8.6625 0 9.01582.14668 9.30957.44043C9.60332.73418 9.75 1.0875 9.75 1.5V3.75H13.5C13.9125 3.75 14.2658 3.89668 14.5596 4.19043C14.8533 4.48418 15 4.8375 15 5.25V13.5C15 13.9125 14.8533 14.2658 14.5596 14.5596C14.2658 14.8533 13.9125 15 13.5 15H1.5C1.0875 15 .73418 14.8533.44043 14.5596C.14668 14.2658 0 13.9125 0 13.5V5.25C0 4.8375.14668 4.48418.44043 4.19043C.73418 3.89668 1.0875 3.75 1.5 3.75H5.25V1.5C5.25 1.0875 5.39668.73418 5.69043.44043C5.98418.14668 6.3375 0 6.75 0H8.25ZM1.5 13.5H13.5V5.25H9.75C9.75 5.6625 9.60332 6.01582 9.30957 6.30957C9.01582 6.60332 8.6625 6.75 8.25 6.75H6.75C6.3375 6.75 5.98418 6.60332 5.69043 6.30957C5.39668 6.01582 5.25 5.6625 5.25 5.25H1.5V13.5ZM5.25 10.3125C5.5374 10.3125 5.80926 10.3403 6.06543 10.3965C6.32168 10.4527 6.5752 10.5379 6.8252 10.6504C7.03755 10.7504 7.20357 10.8911 7.32227 11.0723C7.44075 11.2533 7.49993 11.4499 7.5 11.6621V12H3V11.6621C3.00007 11.4499 3.05925 11.2533 3.17773 11.0723C3.29643 10.8911 3.46245 10.7504 3.6748 10.6504C3.9248 10.5379 4.17832 10.4527 4.43457 10.3965C4.69074 10.3403 4.9626 10.3125 5.25 10.3125ZM12 9.75V10.875H9V9.75H12ZM5.25 7.5C5.5625 7.5 5.82812 7.60938 6.04688 7.82812C6.26562 8.04688 6.375 8.3125 6.375 8.625C6.375 8.9375 6.26562 9.20312 6.04688 9.42188C5.82812 9.64062 5.5625 9.75 5.25 9.75C4.9375 9.75 4.67188 9.64062 4.45312 9.42188C4.23438 9.20312 4.125 8.9375 4.125 8.625C4.125 8.3125 4.23438 8.04688 4.45312 7.82812C4.67188 7.60938 4.9375 7.5 5.25 7.5ZM12 7.5V8.625H9V7.5H12ZM6.75 5.25H8.25V1.5H6.75V5.25Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: "Doctor",
    icon: (
      <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
        <path fillRule="evenodd" clipRule="evenodd" d="M9.27875 3.61979C9.27875 5.05516 8.99208 6.92723 8.55108 6.64314C8.37075 7.37584 7.99216 8.00831 7.47958 8.43315C6.96701 8.85799 6.35206 9.04901 5.73914 8.97379C5.12622 8.89856 4.55311 8.56172 4.11714 8.02046C3.68117 7.4792 3.4092 6.76688 3.34741 6.00446C2.90975 5.05184 2.33575 3.14285 3.81141 1.65481C3.83808 1.64403 3.85408 1.55445 3.87808 1.42257C3.96941 0.923651 4.17175-0.185328 5.44808 0.0265973C6.43241 0.189585 9.27875 0.821628 9.27875 3.61979Z" fill="currentColor"/>
        <path d="M2.33333 12.8216C2.33333 12.3729 2.52433 11.9797 2.811 11.7607C2.80011 11.7091 2.78988 11.6572 2.78033 11.6052C2.72995 11.3218 2.69046 11.0356 2.662 10.7476C2.63357 10.4715 2.61633 10.1938 2.61033 9.91561C1.20333 10.6028 0 11.8005 0 13.058V15.31H12V13.058C12 11.8536 10.8967 10.7044 9.56733 10.0056V10.0172C9.57333 10.2702 9.562 10.5605 9.54 10.8396C9.52 11.0984 9.49033 11.3564 9.45467 11.5774H9.66667C9.72855 11.5775 9.78921 11.5989 9.84184 11.6394C9.89447 11.6799 9.937 11.7379 9.96467 11.8068L10.298 12.6362C10.3213 12.6939 10.3333 12.7573 10.3333 12.8216V13.6511C10.3333 13.761 10.2982 13.8665 10.2357 13.9443C10.1732 14.0221 10.0884 14.0658 10 14.0658H9.33333V13.2363H9.66667V12.9195L9.46067 12.4069H8.53933L8.33333 12.9195V13.2363H8.66667V14.0658H8C7.91159 14.0658 7.82681 14.0221 7.7643 13.9443C7.70179 13.8665 7.66667 13.761 7.66667 13.6511V12.8216C7.66667 12.7573 7.67867 12.6939 7.702 12.6362L8.03533 11.8068C8.063 11.7379 8.10553 11.6799 8.15816 11.6394C8.21079 11.5989 8.27145 11.5775 8.33333 11.5774H8.77167C8.779 11.5418 8.78633 11.5022 8.79367 11.4588C8.827 11.2635 8.85667 11.0159 8.87667 10.76C8.89667 10.5037 8.906 10.2495 8.901 10.0404C8.89991 9.95384 8.89445 9.86741 8.88467 9.78166C8.87733 9.72276 8.87 9.69581 8.86867 9.69L8.86967 9.68876C8.69278 9.62049 8.51387 9.56059 8.33333 9.50918C8.16567 9.46149 7.99233 9.74848 7.91667 9.92805H4L3.97133 9.85838C3.90067 9.68336 3.81367 9.46729 3.66667 9.50918C3.53822 9.5454 3.40989 9.58646 3.28167 9.63235C3.27768 9.7051 3.2759 9.778 3.27633 9.85091C3.27767 10.0803 3.29533 10.361 3.32367 10.6447C3.352 10.9275 3.39033 11.2029 3.43033 11.4202C3.44189 11.483 3.453 11.5389 3.46367 11.5878C3.65424 11.619 3.83355 11.7178 3.98014 11.8725C4.12673 12.0272 4.23439 12.2311 4.29022 12.46C4.34605 12.6888 4.34769 12.9328 4.29495 13.1628C4.24221 13.3927 4.13731 13.5989 3.99283 13.7566C3.84834 13.9143 3.67038 14.0169 3.48026 14.052C3.29013 14.0872 3.0959 14.0534 2.9208 13.9547C2.74571 13.8561 2.59718 13.6967 2.49299 13.4958C2.3888 13.2948 2.33337 13.0607 2.33333 12.8216Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: "Patients",
    icon: (
      <svg width="12" height="15" viewBox="0 0 12 15" fill="none">
        <path d="M6 6C5.175 6 4.46875 5.70625 3.88125 5.11875C3.29375 4.53125 3 3.825 3 3C3 2.175 3.29375 1.46875 3.88125 0.88125C4.46875 0.29375 5.175 0 6 0C6.825 0 7.53125 0.29375 8.11875 0.88125C8.70625 1.46875 9 2.175 9 3C9 3.825 8.70625 4.53125 8.11875 5.11875C7.53125 5.70625 6.825 6 6 6ZM0 15V9.91875C0 9.49375 0.10625 9.10312 0.31875 8.74687C0.53125 8.39062 0.825 8.1125 1.2 7.9125C1.8375 7.5875 2.55937 7.3125 3.36562 7.0875C4.17188 6.8625 5.05 6.75 6 6.75C6.95 6.75 7.82812 6.8625 8.63437 7.0875C9.44062 7.3125 10.1625 7.5875 10.8 7.9125C11.175 8.1125 11.4688 8.39062 11.6812 8.74687C11.8937 9.10312 12 9.49375 12 9.91875V13.5C12 13.9125 11.8531 14.2656 11.5594 14.5594C11.2656 14.8531 10.9125 15 10.5 15H4.3125C3.7375 15 3.25 14.8 2.85 14.4C2.45 14 2.25 13.5125 2.25 12.9375C2.25 12.3625 2.45 11.875 2.85 11.475C3.25 11.075 3.7375 10.875 4.3125 10.875H6.43125L7.59375 8.4C7.34375 8.35 7.0875 8.3125 6.825 8.2875C6.5625 8.2625 6.2875 8.25 6 8.25C5.1 8.25 4.3 8.35938 3.6 8.57812C2.9 8.79688 2.33125 9.025 1.89375 9.2625C1.76875 9.325 1.67188 9.41563 1.60312 9.53438C1.53437 9.65312 1.5 9.78125 1.5 9.91875V15H0ZM4.3125 13.5H5.2125L5.7375 12.375H4.3125C4.1625 12.375 4.03125 12.4312 3.91875 12.5437C3.80625 12.6562 3.75 12.7875 3.75 12.9375C3.75 13.0875 3.80625 13.2188 3.91875 13.3313C4.03125 13.4438 4.1625 13.5 4.3125 13.5ZM6.8625 13.5H10.5V9.91875C10.5 9.78125 10.4656 9.65312 10.3969 9.53438C10.3281 9.41563 10.2375 9.325 10.125 9.2625C9.975 9.1875 9.8125 9.10938 9.6375 9.02812C9.4625 8.94687 9.275 8.86875 9.075 8.79375L6.8625 13.5Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: "Appointment",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1.5 13.5C1.0875 13.5.734375 13.3678.440625 13.1034C.146875 12.8391 0 12.5213 0 12.15V2.7C0 2.32875.146875 2.01094.440625 1.74656C.734375 1.48219 1.0875 1.35 1.5 1.35H2.25V0H3.75V1.35H9.75V0H11.25V1.35H12C12.4125 1.35 12.7656 1.48219 13.0594 1.74656C13.3531 2.01094 13.5 2.32875 13.5 2.7V12.15C13.5 12.5213 13.3531 12.8391 13.0594 13.1034C12.7656 13.3678 12.4125 13.5 12 13.5H1.5ZM1.5 12.15H12V5.4H1.5V12.15ZM1.5 4.05H12V2.7H1.5V4.05Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: "Billing",
    icon: (
      <svg width="14" height="15" viewBox="0 0 14 15" fill="none">
        <path d="M2.25 15C1.625 15 1.09375 14.7812.65625 14.3438C.21875 13.9062 0 13.375 0 12.75V10.5H2.25V0L3.375 1.125L4.5 0L5.625 1.125L6.75 0L7.875 1.125L9 0L10.125 1.125L11.25 0L12.375 1.125L13.5 0V12.75C13.5 13.375 13.2812 13.9062 12.8438 14.3438C12.4062 14.7812 11.875 15 11.25 15H2.25Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: "Protocol",
    icon: (
      <svg width="13" height="15" viewBox="0 0 13 15" fill="none">
        <path d="M5.68803 12.8126L11.1047 6.56262C11.3578 6.27642 11.5592 5.93516 11.6973 5.55857C11.8354 5.18199 11.9074 4.77755 11.9092 4.36865C11.911 3.95975 11.8425 3.5545 11.7078 3.17632C11.573 2.79815 11.3745 2.45456 11.1239 2.16542C10.8734 1.87628 10.5756 1.64732 10.2478 1.49179C9.92007 1.33627 9.56885 1.25725 9.21447 1.25932C8.86009 1.26138 8.50958 1.34449 8.18321 1.50383C7.85683 1.66317 7.56108 1.89558 7.31303 2.18762L1.89636 8.43762C1.64326 8.72383 1.44183 9.06509 1.30374 9.44167C1.16565 9.81826 1.09362 10.2227 1.09183 10.6316C1.09004 11.0405 1.15852 11.4458 1.29331 11.8239C1.4281 12.2021 1.62653 12.5457 1.87712 12.8348C2.12771 13.124 2.42548 13.3529 2.75324 13.5085C3.08099 13.664 3.43221 13.743 3.78659 13.7409C4.14097 13.7389 4.49148 13.6558 4.81785 13.4964C5.14423 13.3371 5.43999 13.1047 5.68803 12.8126Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4.60352 5.3125L8.39518 9.6875" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    hasArrow: true,
  },
];

const bottomNavItems = [
  {
    label: "Settings",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M5.475 15L5.175 12.6C5.0125 12.5375 4.85938 12.4625 4.71562 12.375C4.57187 12.2875 4.43125 12.1938 4.29375 12.0938L2.0625 13.0312L0 9.46875L1.93125 8.00625C1.91875 7.91875 1.9125 7.83438 1.9125 7.75313C1.9125 7.67188 1.9125 7.5875 1.9125 7.5C1.9125 7.4125 1.9125 7.32812 1.9125 7.24687C1.9125 7.16562 1.91875 7.08125 1.93125 6.99375L0 5.53125L2.0625 1.96875L4.29375 2.90625C4.43125 2.80625 4.575 2.7125 4.725 2.625C4.875 2.5375 5.025 2.4625 5.175 2.4L5.475 0H9.6L9.9 2.4C10.0625 2.4625 10.2156 2.5375 10.3594 2.625C10.5031 2.7125 10.6438 2.80625 10.7812 2.90625L13.0125 1.96875L15.075 5.53125L13.1438 6.99375C13.1562 7.08125 13.1625 7.16562 13.1625 7.24687C13.1625 7.32812 13.1625 7.4125 13.1625 7.5C13.1625 7.5875 13.1625 7.67188 13.1625 7.75313C13.1625 7.83438 13.15 7.91875 13.125 8.00625L15.0562 9.46875L12.9937 13.0312L10.7812 12.0938C10.6438 12.1938 10.5 12.2875 10.35 12.375C10.2 12.4625 10.05 12.5375 9.9 12.6L9.6 15H5.475Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: "Support",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.4625 12C7.725 12 7.94688 11.9094 8.12813 11.7281C8.30937 11.5469 8.4 11.325 8.4 11.0625C8.4 10.8 8.30937 10.5781 8.12813 10.3969C7.94688 10.2156 7.725 10.125 7.4625 10.125C7.2 10.125 6.97813 10.2156 6.79688 10.3969C6.61562 10.5781 6.525 10.8 6.525 11.0625C6.525 11.325 6.61562 11.5469 6.79688 11.7281C6.97813 11.9094 7.2 12 7.4625 12ZM6.7875 9.1125H8.175C8.175 8.7 8.22188 8.375 8.31563 8.1375C8.40938 7.9 8.675 7.575 9.1125 7.1625C9.4375 6.8375 9.69375 6.52812 9.88125 6.23438C10.0688 5.94063 10.1625 5.5875 10.1625 5.175C10.1625 4.475 9.90625 3.9375 9.39375 3.5625C8.88125 3.1875 8.275 3 7.575 3C6.8625 3 6.28437 3.1875 5.84062 3.5625C5.39687 3.9375 5.0875 4.3875 4.9125 4.9125L6.15 5.4C6.2125 5.175 6.35313 4.93125 6.57188 4.66875C6.79063 4.40625 7.125 4.275 7.575 4.275C7.975 4.275 8.275 4.38438 8.475 4.60313C8.675 4.82188 8.775 5.0625 8.775 5.325C8.775 5.575 8.7 5.80937 8.55 6.02812C8.4 6.24687 8.2125 6.45 7.9875 6.6375C7.4375 7.125 7.1 7.49375 6.975 7.74375C6.85 7.99375 6.7875 8.45 6.7875 9.1125ZM7.5 15C6.4625 15 5.4875 14.8031 4.575 14.4094C3.6625 14.0156 2.86875 13.4812 2.19375 12.8062C1.51875 12.1312.984375 11.3375.590625 10.425C.196875 9.5125 0 8.5375 0 7.5C0 6.4625.196875 5.4875.590625 4.575C.984375 3.6625 1.51875 2.86875 2.19375 2.19375C2.86875 1.51875 3.6625.984375 4.575.590625C5.4875.196875 6.4625 0 7.5 0C8.5375 0 9.5125.196875 10.425.590625C11.3375.984375 12.1312 1.51875 12.8062 2.19375C13.4812 2.86875 14.0156 3.6625 14.4094 4.575C14.8031 5.4875 15 6.4625 15 7.5C15 8.5375 14.8031 9.5125 14.4094 10.425C14.0156 11.3375 13.4812 12.1312 12.8062 12.8062C12.1312 13.4812 11.3375 14.0156 10.425 14.4094C9.5125 14.8031 8.5375 15 7.5 15Z" fill="currentColor"/>
      </svg>
    ),
  },
];



// Cosmetic-only values the real /employees endpoint doesn't return (avatar
// initials/colors, department badge colors) — cycled per row so real data
// still renders with the same visual style as the static fallback rows.
const AVATAR_PALETTE = [
  { avatarColor: "#00488D", initBg: "#D6E3FF" },
  { avatarColor: "#7B3200", initBg: "#FFDBCB" },
  { avatarColor: "#00C896", initBg: "rgba(0,200,150,0.12)" },
  { avatarColor: "#475C7F", initBg: "#E6E8EA" },
];

function getInitials(name: string): string {
  const words = name.replace(/^Dr\.?\s*/i, "").trim().split(/\s+/);
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatBranch(branch: EmployeeRecord["branch"]): string {
  if (!branch?.branch_name) return "—";
  return branch.branch_area ? `${branch.branch_name} (${branch.branch_area})` : branch.branch_name;
}

function mapEmployeeRecord(doc: EmployeeRecord, index: number) {
  const palette = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  const fullName = `${doc.first_name} ${doc.middle_name ? doc.middle_name + " " : ""}${doc.last_name}`;
  const role = doc.user_table?.role_type || "DOCTOR";
  const branchName = formatBranch(doc.branch);
  const isActive = doc.emp_status === true || doc.user_table?.user_status === 1;
  return {
    avatar: getInitials(fullName),
    avatarColor: palette.avatarColor,
    initBg: palette.initBg,
    name: fullName,
    id: doc.employee_id,
    dept: doc.department_master?.department_name || doc.specialization || "Unassigned",
    deptBg: "#E6E8EA",
    deptColor: "#475C7F",
    branch: branchName,
    status: isActive ? "Active" : "Inactive",
  };
}

function parseStatValue(value: string): number {
  return Number(value.replace(/,/g, ""));
}

function formatStatValue(value: number): string {
  return value.toLocaleString();
}

function CountUp({ target, duration = 1800 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number>(0);

  useEffect(() => {
    startTime.current = null;
    const animate = (now: number) => {
      if (startTime.current === null) startTime.current = now;
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      }
    };
    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
  }, [target, duration]);

  return <>{formatStatValue(count)}</>;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("doctors");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  // Real doctors/staff fetched from the backend. No dummy fallback — an
  // empty/failed fetch just leaves these null and the tab shows no rows.
  const [realDoctors, setRealDoctors] = useState<Record<string, unknown>[] | null>(null);
  const [realStaff, setRealStaff] = useState<Record<string, unknown>[] | null>(null);
  const [isEmployeesLoading, setIsEmployeesLoading] = useState(true);
  const [patientCount, setPatientCount] = useState<number>(0);

  useEffect(() => {
    patientApi
      .getAll({ limit: 1 })
      .then((res) => {
        setPatientCount(res.data?.data?.total ?? 0);
      })
      .catch(() => {
        setPatientCount(0);
      });
  }, []);

  useEffect(() => {
    console.log("[Dashboard] Fetching all employees from employeeApi...");
    employeeApi
      .getAll()
      .then((res) => {
        console.log("[Dashboard] Response:", res.data);
        const allEmployees = res.data?.data?.employees || [];
        // Filter on frontend by user_table.role_type
        const doctors = allEmployees.filter((e) => e.user_table?.role_type === "DOCTOR");
        const staff = allEmployees.filter((e) => e.user_table?.role_type !== "DOCTOR");

        setRealDoctors(doctors.map(mapEmployeeRecord));
        setRealStaff(staff.map(mapEmployeeRecord));

        if (doctors.length === 0) {
          toast({
            title: "No doctor records found",
            description: "The employees API returned no doctor records.",
          });
        }
        if (staff.length === 0) {
          toast({
            title: "No staff records found",
            description: "The employees API returned no staff records.",
          });
        }
      })
      .catch((err) => {
        console.error("[Dashboard] Error:", err);
        console.error("[Dashboard] Error response:", err.response?.data);
        console.error("[Dashboard] Error status:", err.response?.status);
        toast({
          title: "Failed to load employees",
          description: "Couldn't reach the employees API.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsEmployeesLoading(false);
      });
  }, []);

  const liveStats = useMemo(() => [
    {
      label: "Doctors",
      value: (realDoctors?.length ?? 0).toLocaleString(),
      change: "",
      changeType: "positive",
      bg: "#D6E3FF",
      border: "#00488D",
      valueColor: "#00488D",
      icon: <Stethoscope className="h-4 w-4" color="#00488D" />,
      iconBg: "rgba(255,255,255,0.20)",
    },
    {
      label: "Patients",
      value: patientCount.toLocaleString(),
      change: "",
      changeType: "positive",
      bg: "rgba(0,200,150,0.12)",
      border: "#00C896",
      valueColor: "#00C896",
      icon: <UserRound className="h-4 w-4" color="#00C896" />,
      iconBg: "rgba(255,255,255,0.20)",
    },
    {
      label: "Staff",
      value: (realStaff?.length ?? 0).toLocaleString(),
      change: "",
      changeType: "neutral",
      bg: "rgba(255,107,53,0.12)",
      border: "rgba(123,50,0,0.40)",
      valueColor: "#7B3200",
      icon: <Users className="h-4 w-4" color="#7B3200" />,
      iconBg: "#FFDBCB",
    },
    {
      label: "Appointments",
      value: "1,204",
      change: "+114",
      changeType: "positive",
      bg: "rgba(255,255,255,0.80)",
      border: "#C2C6D4",
      valueColor: "#00488D",
      icon: <CalendarIcon className="h-4 w-4" color="#00488D" />,
      iconBg: "rgba(168,200,255,0.20)",
    },
    {
      label: "Prescription Generated",
      value: "8,432",
      change: "124",
      changeType: "negative",
      bg: "#E6E8EA",
      border: "#4A5F83",
      valueColor: "#4A5F83",
      icon: <FileText className="h-4 w-4" color="#4A5F83" />,
      iconBg: "rgba(236,238,240,0.40)",
    },
    {
      label: "Bills Generated",
      value: "2700",
      change: "+160",
      changeType: "positive",
      bg: "#D6E3FF",
      border: "#00488D",
      valueColor: "#00488D",
      icon: <Receipt className="h-4 w-4" color="#00488D" />,
      iconBg: "rgba(255,255,255,0.20)",
    },
  ], [realDoctors, realStaff, patientCount]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Sort state (per tab)
  const [sortField, setSortField] = useState<Record<string, string>>({});
  const [sortDirection, setSortDirection] = useState<Record<string, "asc" | "desc">>({});

  // Tabs sliding underline
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });

  // Date selection state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const {
    values: filterValues,
    appliedValues,
    isOpen: isFilterOpen,
    setIsOpen: setIsFilterOpen,
    handleChange: handleFilterChange,
    handleApply: handleApplyFilter,
    handleClear: handleClearFilter,
  } = useFilterPanel();

  useEffect(() => {
    handleClearFilter();
  }, [activeTab]);

  const doctorFilterFields: FilterField[] = [
    { id: "name", label: "Doctor Name", type: "text", placeholder: "Search by name" },
    { id: "dept", label: "Department", type: "multiselect", options: [
      { label: "Cardiology", value: "Cardiology" },
      { label: "Neurology", value: "Neurology" },
      { label: "Orthopedics", value: "Orthopedics" },
      { label: "Dermatology", value: "Dermatology" },
      { label: "ENT", value: "ENT" },
      { label: "Gynecology", value: "Gynecology" },
      { label: "Urology", value: "Urology" },
      { label: "Orthology", value: "Orthology" },
    ]},
    { id: "branch", label: "Branch", type: "multiselect", options: [
      { label: "Central Hospital (Tambaram)", value: "Central Hospital (Tambaram)" },
      { label: "Central Hospital (Saidapet)", value: "Central Hospital (Saidapet)" },
      { label: "Central Hospital (Egmore)", value: "Central Hospital (Egmore)" },
    ]},
    { id: "status", label: "Status", type: "multiselect", options: [
      { label: "Active", value: "Active" },
      { label: "Leave", value: "Leave" },
    ]},
  ];

  const staffFilterFields: FilterField[] = [
    { id: "name", label: "Staff Name", type: "text", placeholder: "Search by name" },
    { id: "dept", label: "Department", type: "multiselect", options: [
      { label: "Emergency", value: "Emergency" },
      { label: "Radiology", value: "Radiology" },
      { label: "Surgery", value: "Surgery" },
      { label: "Pathology", value: "Pathology" },
      { label: "Maternity", value: "Maternity" },
      { label: "Pharmacy", value: "Pharmacy" },
      { label: "Pulmonology", value: "Pulmonology" },
      { label: "Neurology", value: "Neurology" },
    ]},
    { id: "branch", label: "Branch", type: "multiselect", options: [
      { label: "Central Hospital (Tambaram)", value: "Central Hospital (Tambaram)" },
      { label: "Central Hospital (Saidapet)", value: "Central Hospital (Saidapet)" },
      { label: "Central Hospital (Egmore)", value: "Central Hospital (Egmore)" },
    ]},
    { id: "status", label: "Status", type: "multiselect", options: [
      { label: "Active", value: "Active" },
      { label: "Leave", value: "Leave" },
    ]},
  ];

  const appointmentFilterFields: FilterField[] = [
    { id: "patientName", label: "Patient Name", type: "text", placeholder: "Search by name" },
    { id: "doctorName", label: "Doctor Name", type: "text", placeholder: "Search by doctor" },
    { id: "reason", label: "Reason", type: "text", placeholder: "Search reason" },
    { id: "status", label: "Status", type: "multiselect", options: [
      { label: "Active", value: "Active" },
      { label: "Leave", value: "Leave" },
    ]},
  ];

  const activeFilterFields = useMemo(() => {
    switch (activeTab) {
      case "staff": return staffFilterFields;
      case "appointments": return appointmentFilterFields;
      default: return doctorFilterFields;
    }
  }, [activeTab]);

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;
    const activeButton = container.querySelector<HTMLButtonElement>(`[data-tab="${activeTab}"]`);
    if (activeButton) {
      setUnderline({ left: activeButton.offsetLeft, width: activeButton.offsetWidth });
    }
  }, [activeTab]);

  const handleSort = (field: string) => {
    if (sortField[activeTab] === field) {
      setSortDirection((prev) => ({
        ...prev,
        [activeTab]: prev[activeTab] === "asc" ? "desc" : "asc",
      }));
    } else {
      setSortField((prev) => ({ ...prev, [activeTab]: field }));
      setSortDirection((prev) => ({ ...prev, [activeTab]: "asc" }));
    }
  };

  const activeData =
    activeTab === "staff"
      ? (realStaff ?? [])
      : activeTab === "appointments"
        ? appointments
        : (realDoctors ?? []);

  const searchableFields =
    activeTab === "appointments"
      ? ["appointmentNo", "patientName", "doctorName", "reason", "status"]
      : ["name", "id", "dept", "branch", "status"];

  const filteredData = useMemo(() => {
    let result = [...activeData];

    if (searchQuery) {
      result = result.filter((item) =>
        searchableFields.some((field) =>
          String(item[field] ?? "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        )
      );
    }

    result = filterDataByValues(result, appliedValues);

    return result;
  }, [searchQuery, activeTab, appliedValues, realDoctors, realStaff]);

  const currentSortField = sortField[activeTab];
  const currentSortDirection = sortDirection[activeTab];

  const currentData = [...filteredData].sort((a, b) => {
    if (!currentSortField) return 0;
    const aValue = String(a[currentSortField] ?? "").toLowerCase();
    const bValue = String(b[currentSortField] ?? "").toLowerCase();
    if (aValue < bValue) {
      return currentSortDirection === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return currentSortDirection === "asc" ? 1 : -1;
    }
    return 0;
  });

  const totalRecords = currentData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = currentData.slice(startIndex, endIndex);
  const visibleStart = totalRecords === 0 ? 0 : startIndex + 1;
  const visibleEnd = Math.min(endIndex, totalRecords);

  // Branch progress bar state

  const [animatedValues, setAnimatedValues] = useState<Record<number, number>>({});
  const branchRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  const [branches, setBranches] = useState([
    { id: 1, name: "Central Hospital (Tambaram)", pct: 0 },
    { id: 2, name: "Central Hospital (Saidapet)", pct: 0 },
    { id: 3, name: "Central Hospital (Egmore)", pct: 0 },
  ]);

  useEffect(() => {
    setTimeout(() => {
      updateBranchPercentage(1, 60);
      updateBranchPercentage(2, 25);
      updateBranchPercentage(3, 40);
    }, 900);
  }, []);  

  const updateBranchPercentage = (id: number, newPct: number) => {
    setBranches((prev) =>
      prev.map((branch) =>
        branch.id === id ? { ...branch, pct: newPct } : branch,
      ),
    );
  };

  // Initial trigger on scroll
  useEffect(() => {
    const el = branchRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          observer.disconnect();

          branches.forEach((branch, index) => {
            setTimeout(() => {
              let current = 0;
              const interval = setInterval(() => {
                current += 1;
                setAnimatedValues((prev) => ({
                  ...prev,
                  [branch.id]: current,
                }));
                if (current >= branch.pct) {
                  clearInterval(interval);
                }
              }, 30);
            }, index * 200);
          });
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Animate only the branch whose pct changed
useEffect(() => {
  if (!hasAnimated.current) return;

  branches.forEach((branch) => {
    const current = animatedValues[branch.id] ?? 0;

    if (current !== branch.pct) {
      const interval = setInterval(() => {
        setAnimatedValues((prev) => {
          const value = prev[branch.id] ?? 0;

          if (value === branch.pct) {
            clearInterval(interval);
            return prev;
          }

          return {
            ...prev,
            [branch.id]:
              value < branch.pct ? value + 1 : value - 1,
          };
        });
      }, 30);
    }
  });
}, [branches]);

  const navigate = useNavigate();

  const handleEdit = (id: string | number) => {
    navigate(`/destination-edit/${id}`);
  };

  // Doctor rows always route to the real Edit Doctor page, regardless of
  // which page/tab they're clicked from — role drives the destination, not
  // the page. (Staff/Appointments keep the placeholder handler above.)
  const handleEditDoctor = (id: string | number) => {
    navigate(`/doctor/edit/${id}`);
  };

  const handleView = (id: string | number) => {
    navigate(`/destination-view/${id}`);
  };

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Content */}
        <main className="flex flex-col gap-6 border-t border-[#E5E7EB] pt-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
            {liveStats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col p-4 rounded-xl shadow-[2px_2px_16px_0_rgba(0,0,0,0.25)] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
                style={{ background: stat.bg, border: `0.2px solid ${stat.border}` }}
              >
                <div className="flex justify-between items-start">
                  <div
                    className="w-8 h-8 flex items-center justify-center rounded-[4px]"
                    style={{ background: stat.iconBg }}
                  >
                    {stat.icon}
                  </div>
                  <span
                    className="text-[9px] font-semibold leading-[13.5px]"
                    style={{
                      color: stat.changeType === "negative" ? "#EF4444" : "#16A34A",
                    }}
                  >
                    {stat.change}
                  </span>
                </div>
                <div className="pt-2">
                  <div className="font-extrabold text-xl leading-7 tracking-[-1px]" style={{ color: stat.valueColor }}>
                    <CountUp target={parseStatValue(stat.value)} />
                  </div>
                  <div className="text-[rgba(0,0,0,0.70)] text-[9px] font-semibold tracking-[0.9px] capitalize leading-[13.5px]">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

{/* Overview Header */}
           <div className="flex items-end justify-between">
             <div>
               <h2 className="hms-heading">Admin Overview</h2>
               <p className="hms-subheading">Real-time performance across all branches.</p>
             </div>
             <button
               onClick={() => navigate("/appointments/add")}
               className="flex items-center gap-1.5 px-5 py-2.5 bg-[#004785] rounded-[10px] text-white text-xs font-semibold whitespace-nowrap hover:opacity-90 transition-opacity"
             >
               <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                 <path d="M8 2V10M4 6H12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
               </svg>
               Add Appointment
             </button>
           </div>

          {/* Table Card */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col transition-all duration-300 hover:shadow-md">
            <div>
              {/* Table Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(194,198,212,0.10)]">
              <div className="relative flex items-center gap-6" ref={tabsContainerRef}>
                {[
                  { key: "doctors", label: "Doctors" },
                  { key: "staff", label: "Staff" },
                  { key: "appointments", label: "Appointments" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    data-tab={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setCurrentPage(1);
                    }}
                    className="relative pb-1 text-xs font-semibold tracking-[1.2px] capitalize transition-colors duration-200"
                    style={{ color: activeTab === tab.key ? "#00488D" : "#424752" }}
                  >
                    {tab.label}
                  </button>
                ))}
                <div
                  className="absolute bottom-0 h-0.5 bg-[#00488D] transition-all duration-300 ease-out"
                  style={{ left: underline.left, width: underline.width }}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-8 pr-3 py-1.5 bg-[#F2F4F6] text-xs text-[#6B7280] placeholder:text-[#6B7280] outline-none w-[150px] sm:w-[200px] rounded-md transition-all duration-200 focus:rounded-none focus:w-[200px] sm:focus:w-[250px]"
                    />
                  <svg className="absolute left-2 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M11.0667 11.5713L6.86667 7.3713C6.53333 7.638 6.15 7.8491 5.71667 8.0046C5.28333 8.1602 4.82222 8.238 4.33333 8.238C3.12222 8.238 2.09722 7.8185 1.25833 6.9796C0.419444 6.1407 0 5.1157 0 3.90462C0 2.69351.419444 1.66851 1.25833.82962C2.09722-.00927 3.12222-.42871 4.33333-.42871C5.54444-.42871 6.56944-.00927 7.40833.82962C8.24722 1.66851 8.66667 2.69351 8.66667 3.90462C8.66667 4.3935 8.58889 4.8546 8.43333 5.288C8.27778 5.7213 8.06667 6.1046 7.8 6.438L12 10.638L11.0667 11.5713ZM4.33333 6.9046C5.16667 6.9046 5.875 6.613 6.45833 6.0296C7.04167 5.4463 7.33333 4.738 7.33333 3.90462C7.33333 3.07129 7.04167 2.36296 6.45833 1.77962C5.875 1.19629 5.16667.90462 4.33333.90462C3.5.90462 2.79167 1.19629 2.20833 1.77962C1.625 2.36296 1.33333 3.07129 1.33333 3.90462C1.33333 4.738 1.625 5.4463 2.20833 6.0296C2.79167 6.613 3.5 6.9046 4.33333 6.9046Z" fill="#424752"/>
                  </svg>
                </div>
                {/* Date nav */}
                <div className="flex items-center">
                  <button
                    onClick={() => setSelectedDate((prev) => subDays(prev, 1))}
                    className="flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-l-lg transition-colors duration-150 hover:bg-[#F2F4F6]"
                  >
                    <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                      <path d="M5 1L1 5L5 9" stroke="black" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center justify-center h-[27px] w-[90px] px-2 border-t border-b border-[#E5E7EB] bg-white text-xs font-medium transition-colors duration-150 hover:bg-[#F2F4F6]">
                        {isToday(selectedDate)
                          ? "Today"
                          : isYesterday(selectedDate)
                            ? "Yesterday"
                            : isTomorrow(selectedDate)
                              ? "Tomorrow"
                              : format(selectedDate, "dd/MM/yyyy")}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-[#E5E7EB] shadow-lg">
                      <CalendarPicker
                        selected={selectedDate}
                        hideThemePicker
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setIsCalendarOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <button
                    onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
                    className="flex items-center justify-center w-[25px] h-[27px] border border-[#E5E7EB] rounded-r-lg transition-colors duration-150 hover:bg-[#F2F4F6]"
                  >
                    <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                      <path d="M1 1L5 5L1 9" stroke="black" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                {/* Filters */}
                <FilterPopover
                  title="Advanced Filters"
                  fields={activeFilterFields}
                  values={filterValues}
                  onChange={handleFilterChange}
                  onApply={handleApplyFilter}
                  onClear={handleClearFilter}
                  open={isFilterOpen}
                  onOpenChange={setIsFilterOpen}
                />
              </div>
            </div>

            {/* Table / Loading */}
            {(activeTab === "doctors" || activeTab === "staff") && isEmployeesLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B7280] text-sm">
                <Loader2 size={24} className="animate-spin text-[#00488D]" />
                Loading {activeTab}...
              </div>
            ) : (
              <HmsTable
                columns={activeTab === "appointments" ? [
                  { key: "patientName", label: "Patient Name", render: (r: any) => (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 flex items-center justify-center rounded-xl flex-shrink-0 hms-avatar-text" style={{ background: r.avatarBg, color: r.avatarColor }}>{r.avatar}</div>
                      <div><div className="hms-name-text">{r.patientName}</div><div className="hms-id-text">{r.patientId}</div></div>
                    </div>
                  )},
                  { key: "appointmentNo", label: "Appointment No", render: (r: any) => (
                    <span className="px-3 py-1 rounded-[20px] hms-content-text inline-block" style={{ background: "#EEF2FF", color: "#4F46E5" }}>{r.appointmentNo}</span>
                  )},
                  { key: "doctorName", label: "Assigned Doctor", render: (r: any) => (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 flex items-center justify-center rounded-xl flex-shrink-0 hms-avatar-text" style={{ background: r.doctorAvatarBg, color: r.doctorAvatarcolor }}>{r.doctorAvatar}</div>
                      <div><div className="hms-name-text">{r.doctorName}</div><div className="hms-id-text">{r.doctorId}</div></div>
                    </div>
                  )},
                  { key: "reason", label: "Reason", render: (r: any) => <span className="text-[#191C1E] hms-content-text leading-4">{r.reason}</span> },
                  { key: "date", label: "Timing", render: (r: any) => (
                    <div className="text-[#191C1E] hms-content-text leading-4"><div>{r.date}</div><div className="text-[#8C8D8F] hms-department-text">{r.time}</div></div>
                  )},
                  { key: "status", label: "Status", render: (r: any) => {
                    const isActive = String(r.status) === "Active";
                    return (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: isActive ? "#F0FDF4" : "#FFF7ED", color: isActive ? "#16A34A" : "#F97316" }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? "#22C55E" : "#F97316" }} />
                        {r.status}
                      </span>
                    );
                  }},
                  { key: "actions", label: "Action", sortable: false, render: (r: any) => (
                    <div className="flex items-center gap-1">
                      <button title="View" onClick={() => handleView(r.id)} className="p-1.5 rounded transition-colors duration-200 hover:bg-none group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#1B1D20] group-hover:stroke-[#505F76]">
                          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button title="Edit" onClick={() => handleEdit(r.id)} className="p-1.5 rounded transition-colors duration-200 hover:bg-blue-50 group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.36" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#003EA8] group-hover:stroke-[#5E87CF]">
                          <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                        </svg>
                      </button>
                    </div>
                  )},
                ] : [
                  { key: "name", label: "Name", render: (r: any) => (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 flex items-center justify-center rounded-xl flex-shrink-0 hms-avatar-text" style={{ background: r.initBg, color: r.avatarColor }}>{r.avatar}</div>
                      <div><div className="hms-name-text">{r.name}</div><div className="hms-id-text">{r.id}</div></div>
                    </div>
                  )},
                  { key: "dept", label: "Department", render: (r: any) => (
                    <span className="px-1.5 py-0.5 rounded-sm hms-department-text tracking-[-0.4px] capitalize" style={{ background: r.deptBg, color: r.deptColor }}>{r.dept}</span>
                  )},
                  { key: "branch", label: "Branch", render: (r: any) => <span className="text-[#191C1E] hms-content-text leading-4">{r.branch}</span> },
                  { key: "status", label: "Status", render: (r: any) => {
                    const isActive = String(r.status) === "Active";
                    return (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: isActive ? "#F0FDF4" : "#FFF7ED", color: isActive ? "#16A34A" : "#F97316" }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? "#22C55E" : "#F97316" }} />
                        {r.status}
                      </span>
                    );
                  }},
                  { key: "actions", label: "Actions", sortable: false, render: (r: any) => (
                    <div className="flex items-center gap-1">
                      <button title="View" onClick={() => handleView(r.id)} className="p-1.5 rounded transition-colors duration-200 hover:bg-none group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#1B1D20] group-hover:stroke-[#505F76]">
                          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button title="Edit" onClick={() => (activeTab === "doctors" ? handleEditDoctor : handleEdit)(r.id)} className="p-1.5 rounded transition-colors duration-200 hover:bg-blue-50 group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.36" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200 stroke-[#003EA8] group-hover:stroke-[#5E87CF]">
                          <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
                        </svg>
                      </button>
                    </div>
                  )},
                ]}
                data={currentRows}
                sortField={sortField[activeTab] ?? ""}
                sortDirection={sortDirection[activeTab] ?? "asc"}
                onSort={handleSort}
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                rowsPerPage={rowsPerPage}
                visibleStart={visibleStart}
                visibleEnd={visibleEnd}
                onPageChange={setCurrentPage}
                onRowsPerPageChange={(val) => { setRowsPerPage(val); setCurrentPage(1); }}
                rowsPerPageOptions={[5, 10, 20]}
                emptyMessage={`No ${activeTab} found matching the current filters.`}
                rowKey={(r) => String((r as any).id)}
              />
            )}
            </div>
          </div>

          {/* Bottom Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
            {/* Branch Performance */}
            <div ref={branchRef} className="bg-white rounded-lg border border-[rgba(194,198,212,0.10)] p-5 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[#191C1E] font-extrabold text-base leading-6 tracking-[-0.4px]">Branch Performance</h3>
                  <p className="text-[#424752] text-[9px] font-semibold tracking-[0.9px] capitalize">Efficiency</p>
                </div>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M3.33333 11.6667H5V7.5H3.33333V11.6667ZM10 11.6667H11.6667V3.33333H10V11.6667ZM6.66667 11.6667H8.33333V9.16667H6.66667V11.6667ZM6.66667 7.5H8.33333V5.83333H6.66667V7.5ZM1.66667 15C1.20833 15.815972 14.8368 14.5104 14.184 15 13.7917 15 13.3333V1.66667C13.3333 1.20833 13.7917.815972 14.5104.489583C14.184.163194 13.7917 0 13.3333 0H1.66667C1.20833 0 .815972.163194.489583.489583C.163194.815972 0 1.20833 0 1.66667V13.3333C0 13.7917.163194 14.184.489583 14.5104C.815972 14.8368 1.20833 15 1.66667 15Z" fill="#00488D"/>
                </svg>
              </div>
              <div className="flex flex-col gap-4">
                {branches.map((branch) => (
                  <div key={branch.id} className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span className="text-[#191C1E] text-[9px] font-semibold tracking-[0.9px] capitalize">{branch.name}</span>
                      <span className="text-[#00488D] text-[9px] font-semibold tracking-[0.9px] uppercase">{animatedValues[branch.id] ?? 0}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#ECEEF0] overflow-hidden">
                      <div className="h-full rounded-full bg-[#00488D] transition-all duration-200" style={{ width: `${animatedValues[branch.id] ?? 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Integrity */}
            <div className="bg-white rounded-lg border border-[rgba(194,198,212,0.10)] p-5 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[#191C1E] font-extrabold text-base leading-6 tracking-[-0.4px]">System Integrity</h3>
                  <p className="text-[#424752] text-[9px] font-semibold tracking-[0.9px] capitalize">Alerts</p>
                </div>
                <button className="px-3 py-1 rounded border border-[rgba(194,198,212,0.30)] text-[#424752] text-[9px] font-semibold tracking-[0.9px]">View All</button>
              </div>
              <div className="flex flex-col gap-2">
                {/* Alert 1 */}
                <div className="flex items-start gap-3 p-2 rounded-[4px]">
                  <svg width="17" height="15" viewBox="0 0 17 15" fill="none" className="flex-shrink-0 mt-0.5">
                    <path d="M0 14.25L8.25 0L16.5 14.25H0ZM2.5875 12.75H13.9125L8.25 3L2.5875 12.75ZM8.25 12C8.4625 12 8.64062 11.9281 8.78438 11.7844C8.92813 11.6406 9 11.4625 9 11.25C9 11.0375 8.92813 10.8594 8.78438 10.7156C8.64062 10.5719 8.4625 10.5 8.25 10.5C8.0375 10.5 7.85938 10.5719 7.71562 10.7156C7.57187 10.8594 7.5 11.0375 7.5 11.25C7.5 11.4625 7.57187 11.6406 7.71562 11.7844C7.85938 11.9281 8.0375 12 8.25 12ZM7.5 9.75H9V6H7.5V9.75Z" fill="#BA1A1A"/>
                  </svg>
                  <div>
                    <div className="text-[#191C1E] font-semibold text-xs leading-[15px]">Admin Access Granted</div>
                    <div className="text-[#424752] font-normal text-[10px] leading-[15px]">John Doe (IT) authorized for DB.</div>
                  </div>
                </div>
                {/* Alert 2 */}
                <div className="flex items-start gap-3 p-2 rounded-[4px]">
                  <svg width="17" height="15" viewBox="0 0 17 15" fill="none" className="flex-shrink-0 mt-0.5">
                    <path d="M0 14.25L8.25 0L16.5 14.25H0ZM2.5875 12.75H13.9125L8.25 3L2.5875 12.75ZM8.25 12C8.4625 12 8.64062 11.9281 8.78438 11.7844C8.92813 11.6406 9 11.4625 9 11.25C9 11.0375 8.92813 10.8594 8.78438 10.7156C8.64062 10.5719 8.4625 10.5 8.25 10.5C8.0375 10.5 7.85938 10.5719 7.71562 10.7156C7.57187 10.8594 7.5 11.0375 7.5 11.25C7.5 11.4625 7.57187 11.6406 7.71562 11.7844C7.85938 11.9281 8.0375 12 8.25 12ZM7.5 9.75H9V6H7.5V9.75Z" fill="#BA1A1A"/>
                  </svg>
                  <div>
                    <div className="text-[#191C1E] font-semibold text-xs leading-[15px]">Server Latency</div>
                    <div className="text-[#424752] font-normal text-[10px] leading-[15px]">Billing module experiencing delays.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}