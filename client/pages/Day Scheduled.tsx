import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { User, IdCard, Phone, Mail, MapPin, Cake, Droplet, VenusAndMars, Briefcase } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import CalendarPicker from "@/components/hms/Calender";
import ScheduleSlotModal, { type ScheduleSlotModalHandle } from "@/components/hms/ScheduleSlotModal";
import { employeeApi, type EmployeeDetailResponse, type DoctorScheduleRecord } from "@/api/employee.api";

function formatDoctorFullName(e: EmployeeDetailResponse["employee"] | null): string {
  if (!e) return "Doctor";
  return `Dr. ${[e.first_name, e.middle_name, e.last_name].filter(Boolean).join(" ")}`;
}

// doctor_schedule.start_time/end_time come back as UTC-anchored time values
// -- read with UTC getters so the displayed hour doesn't shift with the
// browser's local timezone.
function formatScheduleTime(time: string | null): string {
  if (!time) return "";
  const d = new Date(time);
  if (isNaN(d.getTime())) return "";
  const hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${minutes} ${period}`;
}

const WEEK_DAYS = [
  ["Monday"],
  ["Tuesday"],
  ["Wednesday"],
  ["Thursday"],
  ["Friday"],
  ["Saturday"],
  ["Sunday"],
];

// Monday-Sunday dates (dd/mm/yy) for the week containing `reference`.
const getWeekDates = (reference) => {
  const day = reference.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(reference);
  monday.setDate(monday.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear() % 100).padStart(2, "0");
    return `${dd}/${mm}/${yy}`;
  });
};

const shiftDate = (dateStr, days) => {
  const [dd, mm, yy] = dateStr.split("/").map(Number);
  const date = new Date(2000 + yy, mm - 1, dd);
  date.setDate(date.getDate() + days);
  const newDd = String(date.getDate()).padStart(2, "0");
  const newMm = String(date.getMonth() + 1).padStart(2, "0");
  const newYy = String(date.getFullYear() % 100).padStart(2, "0");
  return `${newDd}/${newMm}/${newYy}`;
};

const parseDate = (dateStr) => {
  const [dd, mm, yy] = dateStr.split("/").map(Number);
  return new Date(2000 + yy, mm - 1, dd);
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const dateKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const buildCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  return cells;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getMonthYearLabel = (year, month) => `${MONTH_NAMES[month]} ${year}`;

export default function DoctorProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("day");

  const [doctorDetail, setDoctorDetail] = useState<EmployeeDetailResponse | null>(null);

  useEffect(() => {
    if (!id) return;
    employeeApi
      .getOne(id)
      .then((res) => setDoctorDetail(res.data?.data ?? null))
      .catch((err) => {
        console.error("[Day Scheduled] Failed to load doctor:", err);
        setDoctorDetail(null);
      });
  }, [id]);

  const doctorEmployee = doctorDetail?.employee ?? null;
  const doctorName = formatDoctorFullName(doctorEmployee);
  const doctorSpecialization = doctorDetail?.doctorProfile?.specialization || doctorEmployee?.specialization || "—";
  const doctorQualification = doctorDetail?.doctorProfile?.qualification || doctorEmployee?.qualification || "—";
  const doctorBranchNames = doctorDetail?.branches?.length
    ? doctorDetail.branches.map((b) => b.branch_name)
    : doctorEmployee?.branch?.branch_name
      ? [doctorEmployee.branch.branch_name]
      : [];
  const doctorIsAvailable = doctorEmployee?.emp_status === true || doctorDetail?.user?.user_status === 0;
  // Only a real photo URL from the backend is used -- no stock/fallback
  // image, so the avatar block simply doesn't render when the doctor has
  // no employee_photo_URL on file.
  const doctorPhoto = doctorEmployee?.employee_photo_URL || "";
  const doctorLicenseNo = doctorDetail?.doctorProfile?.license_no || doctorEmployee?.license_no || "—";
  const doctorPhone = doctorEmployee?.mobile_no || "—";
  const doctorEmail = doctorEmployee?.email || "—";
  const doctorLocation = doctorEmployee?.current_address || doctorEmployee?.parmanent_address || "—";
  const doctorBloodGroup = doctorEmployee?.blood_group || "—";
  const doctorExperience = doctorEmployee?.employee_no_experence != null ? `${doctorEmployee.employee_no_experence}+ yrs` : "—";
  const doctorDOB = (doctorEmployee as any)?.dob
    ? format(new Date((doctorEmployee as any).dob), "dd MMM yyyy")
    : "—";
  const doctorGender = (doctorEmployee as any)?.gender || "—";
  const slotModalRef = useRef<ScheduleSlotModalHandle>(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
  const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);
  const [clearScheduleConfirm, setClearScheduleConfirm] = useState(false);

  // Real weekly availability, grouped by day_of_week from the doctor's
  // active doctor_schedule rows (part of the same employeeApi.getOne(id)
  // response fetched above) -- no fake/placeholder slots.
  const doctorSchedules: DoctorScheduleRecord[] = doctorDetail?.doctorSchedules ?? [];

  const scheduleByDay = useMemo(() => {
    const map: Record<string, { time: string; branch: string }[]> = {};
    WEEK_DAYS.forEach(([day]) => {
      map[day.toUpperCase()] = [];
    });
    doctorSchedules.forEach((s) => {
      const key = (s.day_of_week || "").toUpperCase();
      if (!(key in map)) return;
      map[key].push({
        time: `${formatScheduleTime(s.start_time)} - ${formatScheduleTime(s.end_time)}`,
        branch: s.branch?.branch_name || "",
      });
    });
    return map;
  }, [doctorSchedules]);

  const maxScheduleRows = Math.max(
    1,
    ...WEEK_DAYS.map(([day]) => scheduleByDay[day.toUpperCase()]?.length || 0),
  );

  // Local-only overlay so "+ Add slot"/"Cancel slot" still feel interactive
  // in this view -- there's no schedule-mutation API wired up here, so these
  // edits aren't persisted, only real backend rows are shown by default.
  const [scheduleOverrides, setScheduleOverrides] = useState<
    Record<string, [string, string, string?]>
  >({});

  const schedule = Array.from({ length: maxScheduleRows }, (_, rowIndex) =>
    WEEK_DAYS.map(([day], colIndex) => {
      const overrideKey = `${rowIndex}-${colIndex}`;
      if (scheduleOverrides[overrideKey]) return scheduleOverrides[overrideKey];
      const entry = scheduleByDay[day.toUpperCase()]?.[rowIndex];
      return entry ? ([entry.time, "blue", entry.branch] as [string, string, string]) : ["+", "empty"];
    }),
  );

  const showAlert = (message) => {
    alert(message);
  };

  const submitLeave = (e) => {
    e.preventDefault();

    const form = new FormData(e.target);
    const reason = form.get("reason");

    if (!fromDate || !toDate || !(reason as string).trim()) {
      alert("Please fill in all leave details.");
      return;
    }

    alert("Leave submitted successfully!");
    e.target.reset();
    setFromDate(null);
    setToDate(null);
  };

  const clearSchedule = () => {
    setClearScheduleConfirm(true);
  };

  const handleConfirmClearSchedule = () => {
    alert("Schedule cleared");
    setClearScheduleConfirm(false);
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#172033] font-[Inter,Arial,sans-serif]">

      

      <main className="w-full p-4">

        {/* DOCTOR PROFILE */}
         <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 border-0 bg-transparent text-[#343943] text-sm cursor-pointer"
        >
          <span className="text-[25px] leading-none">‹</span>
          
        </button>
        <section className="bg-white border border-[#edf0f4] rounded-[10px] p-4 flex gap-[18px] mb-4 max-[700px]:flex-col">

          <div className="w-32 h-32 rounded-lg overflow-hidden shrink-0 bg-gray-200 flex items-center justify-center max-[700px]:w-[105px] max-[700px]:h-[105px]">
            {doctorPhoto ? (
              <img
                src={doctorPhoto}
                alt={doctorName}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-1/2 h-1/2 text-gray-400" strokeWidth={1.5} />
            )}
          </div>

          <div className="flex-1">

            <div className="flex justify-between items-start max-[700px]:flex-col max-[700px]:gap-[15px]">

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-[#182235] max-[500px]:text-lg">
                    {doctorName}
                  </h1>

                  <span className="inline-flex items-center gap-[5px] bg-[#edf5ff] text-[#2266c8] border border-[#d5e6ff] px-[9px] py-1 rounded-full text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2675df]" />
                    {doctorSpecialization}
                  </span>
                </div>

                <p className="mt-[5px] text-[#707784] text-[13px]">
                  {doctorQualification}
                </p>
              </div>

              <button
                onClick={() => navigate("/appointments/book", { state: { doctorId: id } })}
                className="border-0 bg-[#004a91] hover:bg-[#003b75] text-white px-[17px] py-[11px] rounded-[7px] text-[13px] font-semibold cursor-pointer max-[700px]:w-full"
              >
                Book Appointment
              </button>

            </div>

            <div className="mt-[21px] flex flex-col gap-3 text-[13px]">

              <div className="text-[#555e6d]">
                <span className="mr-1.5">▣</span>
                Hospital : {doctorBranchNames.length ? doctorBranchNames.join(", ") : "—"}
              </div>

              <div className={`flex items-center gap-[7px] ${doctorIsAvailable ? "text-[#0b955e]" : "text-[#9aa1ab]"}`}>
                <span className={`w-2 h-2 rounded-full ${doctorIsAvailable ? "bg-[#16a866]" : "bg-[#9aa1ab]"}`} />
                {doctorIsAvailable ? "Available" : "Unavailable"}
              </div>

            </div>

          </div>
        </section>

        {/* ABOUT */}
        <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[21px] mb-4">

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg text-[#172033]">
              About
            </h2>

            <button
              onClick={() => showAlert("More doctor information will be displayed.")}
              className="border-0 bg-transparent text-[#135dc5] underline text-[13px] cursor-pointer"
            >
              View More
            </button>
          </div>

          <div className="grid grid-cols-4 gap-x-6 gap-y-5 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1">

            {[
              { Icon: IdCard, title: "Medical Licence Number", value: doctorLicenseNo },
              { Icon: Phone, title: "Phone Number", value: doctorPhone },
              { Icon: Mail, title: "Email", value: doctorEmail },
              { Icon: MapPin, title: "Location", value: doctorLocation },
              { Icon: Cake, title: "DOB", value: doctorDOB },
              { Icon: Droplet, title: "Blood group", value: doctorBloodGroup },
              { Icon: VenusAndMars, title: "Gender", value: doctorGender },
              { Icon: Briefcase, title: "Experience", value: doctorExperience },
            ].map(({ Icon, title, value }) => (
              <div
                key={title}
                className="flex items-start gap-3"
              >
                <div className="w-[23px] h-[23px] flex items-center justify-center text-gray-900 shrink-0">
                  <Icon className="w-[17px] h-[17px]" strokeWidth={1.75} />
                </div>

                <div className="flex flex-col gap-[3px]">
                  <strong className="text-xs font-bold text-[#222938]">
                    {title}
                  </strong>

                  <span className="text-[#6d7480] text-xs leading-[18px]">
                    {value}
                  </span>
                </div>
              </div>
            ))}

          </div>
        </section>

        {/* BIO */}
        <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[21px] mb-[15px]">
          <h2 className="text-lg">
            Short Bio
          </h2>

          <p className="mt-3 text-[#5f6672] text-[13px] leading-[22px]">
            {doctorDetail?.doctorProfile?.doctor_bio?.trim() || "—"}
          </p>
        </section>

        {/* TABS */}
        <div className="h-[39px] flex justify-center items-center gap-[42px]">

          {["day", "week"].map((tab) => (
            <button
              key={tab}
              onClick={() =>
                tab === "week"
                  ? navigate(id ? `/doctor/view/${id}` : "/doctor/view")
                  : setActiveTab(tab)
              }
              className={`h-[39px] px-[17px] border-0 bg-transparent text-xs cursor-pointer ${
                activeTab === tab
                  ? "text-[#004a91] border-b-2 border-[#004a91]"
                  : "text-[#4c515a]"
              }`}
            >
              {tab === "day" ? "Day" : "Week"}
            </button>
          ))}

        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-[minmax(0,1fr)_345px] gap-5 max-[900px]:grid-cols-1">

          {/* LEFT COLUMN */}
          <div className="min-w-0">

            {/* AVAILABILITY */}
            <section className="bg-white border border-[#edf0f4] rounded-[10px] p-5 mb-4">

              <div className="flex items-center justify-between mb-4 max-[700px]:flex-col max-[700px]:items-start max-[700px]:gap-[14px]">

                <h2 className="text-[19px]">
                  Availability
                </h2>

                <div className="flex items-center gap-4 flex-wrap">

                  <button
                    onClick={() => slotModalRef.current?.openAddSlot("")}
                    className="bg-[#004a91] text-white px-[14px] py-2 rounded-md text-xs font-semibold border-0 cursor-pointer"
                  >
                    + Add slot
                  </button>

                </div>

              </div>

              {/* SCHEDULE */}
              <div className="border border-[#b9bfcb] rounded-[7px] overflow-x-auto">

                <div className="min-w-[610px]">

                  {/* HEADER */}
                  <div className="grid grid-cols-7 bg-[#f1f3f5] border-b border-[#b9bfcb]">

                    {WEEK_DAYS.map(([day]) => (
                      <div
                        key={day}
                        className="min-h-[43px] p-[7px_3px] border-r border-[#b9bfcb] flex items-center justify-center text-center text-[#003b80] text-[8px] font-bold"
                      >
                        {day}
                      </div>
                    ))}

                  </div>

                  {/* ROWS */}
                  {schedule.map((row, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="grid grid-cols-7 min-h-[64px] border-b border-[#b9bfcb] last:border-b-0"
                    >
                      {row.map(([text, type, branch], index) => (

                        <div
                          key={index}
                          className="p-1 border-r border-[#b9bfcb] min-w-0"
                        >

                          {type === "off" && (
                            <div className="h-[54px] border border-dashed border-[#b9bfcb] rounded flex items-center justify-center text-[#657080] text-[8px]">
                              Week Off
                            </div>
                          )}

                          {type === "empty" && (
                            <div
                              onClick={() => slotModalRef.current?.openAddSlot(WEEK_DAYS[index][0], rowIndex, index)}
                              className="h-[54px] border border-dashed border-[#b9bfcb] rounded flex items-center justify-center text-[#7d8794] text-lg cursor-pointer hover:border-[#004a91] hover:text-[#004a91]"
                            >
                              +
                            </div>
                          )}

                          {["green", "blue", "orange"].includes(type) && (
                            <div
                              onClick={() =>
                                slotModalRef.current?.openCancelSlot(WEEK_DAYS[index][0], rowIndex, index, text, branch)
                              }
                              className={`cursor-pointer h-[54px] rounded-[3px] p-[5px] flex flex-col justify-start gap-1 overflow-hidden border-l-[3px] ${
                                type === "green"
                                  ? "bg-[#f0faf6] text-[#087d53] border-[#087d53]"
                                  : type === "blue"
                                  ? "bg-[#f1f6ff] text-[#1e5fc7] border-[#1e5fc7]"
                                  : "bg-[#fff7ef] text-[#ed741b] border-[#ed741b]"
                              }`}
                            >
                              <strong className="text-[6px] whitespace-nowrap pl-1">
                                {text}
                              </strong>

                              <small className="text-[6px] leading-[8px]">
                                {branch || "Central Hospital"}
                              </small>
                            </div>
                          )}

                        </div>

                      ))}
                    </div>
                  ))}

                </div>

              </div>

              <button
                onClick={clearSchedule}
                className="block ml-auto mt-[9px] border-0 bg-transparent text-[#666d76] text-[11px] cursor-pointer"
              >
                Clear
              </button>

            </section>

            {/* LEAVE SUBMISSION */}
            <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[31px] max-[500px]:p-5">

              <div className="flex justify-between items-center mb-6 max-[500px]:flex-col max-[500px]:items-start max-[500px]:gap-3">

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 rounded-lg bg-[#fff1f0] text-[#ff453a] flex items-center justify-center text-[22px]">
                    ◷
                  </div>

                  <h2 className="text-[19px]">
                    Leave Submission
                  </h2>

                </div>

                <span className="text-[#a0a7b1] bg-[#f7f8fa] rounded-full px-[11px] py-[5px] text-[9px] tracking-[0.7px]">
                  LEAVE MANAGEMENT
                </span>

              </div>

              <form onSubmit={submitLeave}>

                <div className="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">

                  <div>
                    <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                      FROM
                    </label>

                    <Popover open={isFromCalendarOpen} onOpenChange={setIsFromCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full text-left border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                        >
                          {fromDate ? format(fromDate, "dd/MM/yyyy") : "Select date"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-[#dfe4ea] shadow-lg">
                        <CalendarPicker
                          selected={fromDate}
                          hideThemePicker
                          onSelect={(date) => {
                            setFromDate(date);
                            setIsFromCalendarOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                      TO
                    </label>

                    <Popover open={isToCalendarOpen} onOpenChange={setIsToCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full text-left border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                        >
                          {toDate ? format(toDate, "dd/MM/yyyy") : "Select date"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-[#dfe4ea] shadow-lg">
                        <CalendarPicker
                          selected={toDate}
                          hideThemePicker
                          onSelect={(date) => {
                            setToDate(date);
                            setIsToCalendarOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                </div>

                <textarea
                  name="reason"
                  placeholder="Reason for leave..."
                  className="w-full min-h-[66px] mt-3 resize-y border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                />

                <div className="flex justify-end gap-4 mt-4">

                  <button
                    type="reset"
                    onClick={() => {
                      setFromDate(null);
                      setToDate(null);
                    }}
                    className="h-[38px] px-7 rounded-[9px] text-sm font-semibold cursor-pointer bg-white text-[#ff453a] border-2 border-[#ff453a]"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="h-[38px] px-7 rounded-[9px] text-sm font-semibold cursor-pointer bg-[#004a91] text-white border-2 border-[#004a91]"
                  >
                    Submit
                  </button>

                </div>

              </form>

            </section>

          </div>

          {/* RIGHT COLUMN */}
          <aside className="min-w-0 max-[900px]:grid max-[900px]:grid-cols-2 max-[900px]:gap-5 max-[700px]:block">

            {/* REVIEWS */}
            <section className="bg-white border border-[#edf0f4] rounded-lg overflow-hidden">

              {[
              
                {
                  name: "Sarah Jenkins",
                  time: "1 week ago",
                  image: "https://i.pravatar.cc/100?img=47",
                  rating: "★★★★☆",
                  text: `"Excellent treatment manner. Wait time was a bit longer than expected, but the quality of care definitely made up for it. Highly recommended."`,
                  tags: ["Cardiology"],
                },
                {
                  name: "Robert Wilson",
                  time: "3 days ago",
                  image: "https://i.pravatar.cc/100?img=11",
                  rating: "★★★★★",
                  text: `"The staff and Dr are incredible. I've been a patient here for 2 years and the level of clinical precision and personal attention is unmatched in the city."`,
                  tags: ["Long-term Care", "Referral"],
                },
              ].map((review) => (

                <article
                  key={review.name}
                  className="p-6 border-b border-gray-200"
                >

                  <div className="flex items-start gap-[11px]">

                    <img
                      src={review.image}
                      alt={review.name}
                      className="w-[47px] h-[47px] rounded-full object-cover bg-gray-200"
                    />

                    <div>
                      <h3 className="text-sm mb-[3px]">
                        {review.name}
                      </h3>

                      <span className="text-[#4e5663] text-[10px]">
                        {review.time}
                      </span>
                    </div>

                    <div className="ml-auto text-[#f5a623] text-[13px] tracking-wider">
                      {review.rating}
                    </div>

                  </div>

                  <hr className="border-0 border-t border-gray-200 my-4" />

                  <p className="text-[#4c5360] text-[13px] leading-[22px]">
                    {review.text}
                  </p>

                  <div className="flex flex-wrap gap-[7px] mt-3">

                    {review.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-[#eef8ff] text-[#0d9bd3] rounded-full px-2 py-[3px] text-[9px]"
                      >
                        {tag}
                      </span>
                    ))}

                  </div>

                </article>

              ))}

              <button
                onClick={() => showAlert("All reviews opened.")}
                className="w-full h-9 border-0 bg-[#e9ebef] text-[#004a91] text-[11px] cursor-pointer"
              >
                Read All Reviews
              </button>

            </section>

          </aside>

        </div>

      </main>

      <ScheduleSlotModal
        ref={slotModalRef}
        branches={doctorBranchNames}
        onAddSlot={({ day, row, col, timeLabel, branch }) => {
          if (row !== null && col !== null) {
            setScheduleOverrides((prev) => ({
              ...prev,
              [`${row}-${col}`]: [timeLabel, "blue", branch],
            }));
          }
          showAlert(`Slot added${day ? ` for ${day}` : ""}: ${timeLabel} (${branch})`);
        }}
        onCancelSlot={({ row, col, info }) => {
          setScheduleOverrides((prev) => ({
            ...prev,
            [`${row}-${col}`]: ["+", "empty"],
          }));
          showAlert(`Slot cancelled: ${info}`);
        }}
      />
      <ConfirmationDialog
        open={clearScheduleConfirm}
        onConfirm={handleConfirmClearSchedule}
        onCancel={() => setClearScheduleConfirm(false)}
        type="warning"
        title="Clear Schedule?"
        description="Are you sure you want to clear the schedule? This action cannot be undone."
        confirmText="Clear"
        cancelText="Cancel"
      />
    </div>
  );
}