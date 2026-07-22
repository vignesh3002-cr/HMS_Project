import React, { useState } from "react";

const WEEK_DAYS = [
  ["Monday", "13/05/26"],
  ["Tuesday", "14/05/26"],
  ["Wednesday", "15/05/26"],
  ["Thursday", "16/05/26"],
  ["Friday", "17/05/26"],
  ["Saturday", "18/05/26"],
  ["Sunday", "19/05/26"],
];

const BRANCH_LOCATIONS = ["Tambaram", "Egmore", "Saidapet"];

const formatTime12 = (time) => {
  if (!time) return "";
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, "0")}:${minuteStr} ${period}`;
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

export default function DoctorProfile() {
  const [activeTab, setActiveTab] = useState("week");
  const [selectedDay, setSelectedDay] = useState(13);
  const [addSlotOpen, setAddSlotOpen] = useState(false);
  const [addSlotDay, setAddSlotDay] = useState("");
  const [addSlotPos, setAddSlotPos] = useState(null);
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [slotBranch, setSlotBranch] = useState("");
  const [cancelSlotOpen, setCancelSlotOpen] = useState(false);
  const [cancelSlotPos, setCancelSlotPos] = useState(null);
  const [cancelSlotInfo, setCancelSlotInfo] = useState("");
  const [weekDates, setWeekDates] = useState(WEEK_DAYS.map(([, date]) => date));

  const calendarDays = [
    { day: 26, muted: true },
    { day: 27, muted: true },
    { day: 28, muted: true },
    { day: 29, muted: true },
    { day: 30, muted: true },
    { day: 1 },
    { day: 2 },
    { day: 3 },
    { day: 4 },
    { day: 5 },
    { day: 6 },
    { day: 7 },
    { day: 8 },
    { day: 9 },
    { day: 10 },
    { day: 11 },
    { day: 12 },
    { day: 13 },
    { day: 14 },
    { day: 15 },
    { day: 16 },
    { day: 17 },
    { day: 18 },
    { day: 19 },
    { day: 20 },
    { day: 21 },
    { day: 22 },
    { day: 23 },
    { day: 24 },
    { day: 25 },
    { day: 26 },
    { day: 27 },
    { day: 28 },
    { day: 29 },
    { day: 30 },
    { day: 31 },
  ];

  const [schedule, setSchedule] = useState([
    [
      ["10:30 AM - 12:30 PM", "green"],
      ["10:30 AM - 12:30 PM", "blue"],
      ["09:30 AM - 11:30 AM", "green"],
      ["09:30 AM - 11:30 AM", "orange"],
      ["09:30 AM - 11:30 AM", "orange"],
      ["Week Off", "off"],
      ["06:00 PM - 09:00 PM", "orange"],
    ],
    [
      ["02:30 PM - 04:30 PM", "blue"],
      ["01:00 PM - 03:00 PM", "orange"],
      ["06:00 PM - 09:00 PM", "orange"],
      ["02:00 PM - 05:30 PM", "green"],
      ["04:00 PM - 06:00 PM", "green"],
      ["Week Off", "off"],
      ["Week Off", "off"],
    ],
    [
      ["06:30 PM - 09:30 PM", "green"],
      ["07:00 PM - 09:30 PM", "blue"],
      ["Week Off", "off"],
      ["07:00 PM - 09:30 PM", "blue"],
      ["Week Off", "off"],
      ["Week Off", "off"],
      ["+", "empty"],
    ],
    [
      ["+", "empty"],
      ["+", "empty"],
      ["+", "empty"],
      ["+", "empty"],
      ["+", "empty"],
      ["Week Off", "off"],
      ["+", "empty"],
    ],
  ]);

  const showAlert = (message) => {
    alert(message);
  };

  const submitLeave = (e) => {
    e.preventDefault();

    const form = new FormData(e.target);
    const from = form.get("from");
    const to = form.get("to");
    const reason = form.get("reason");

    if (!from || !to || !(reason as string).trim()) {
      alert("Please fill in all leave details.");
      return;
    }

    alert("Leave submitted successfully!");
    e.target.reset();
  };

  const clearSchedule = () => {
    if (window.confirm("Are you sure you want to clear the schedule?")) {
      alert("Schedule cleared");
    }
  };

  const previousWeek = () => {
    setWeekDates((prev) => prev.map((date) => shiftDate(date, -7)));
  };

  const openAddSlot = (dayName, rowIndex = null, colIndex = null) => {
    setAddSlotDay(dayName);
    setAddSlotPos(rowIndex === null || colIndex === null ? null : { row: rowIndex, col: colIndex });
    setSlotStart("");
    setSlotEnd("");
    setSlotBranch("");
    setAddSlotOpen(true);
  };

  const closeAddSlot = () => {
    setAddSlotOpen(false);
  };

  const confirmAddSlot = () => {
    if (!slotStart || !slotEnd || !slotBranch) {
      alert("Please select start time, end time and branch location.");
      return;
    }

    const timeLabel = `${formatTime12(slotStart)} - ${formatTime12(slotEnd)}`;

    if (addSlotPos) {
      const { row, col } = addSlotPos;
      setSchedule((prev) =>
        prev.map((scheduleRow, rowIdx) =>
          rowIdx !== row
            ? scheduleRow
            : scheduleRow.map((cell, colIdx) =>
                colIdx !== col ? cell : [timeLabel, "blue", slotBranch]
              )
        )
      );
    }

    setAddSlotOpen(false);
    showAlert(
      `Slot added${addSlotDay ? ` for ${addSlotDay}` : ""}: ${timeLabel} (${slotBranch})`
    );
  };

  const openCancelSlot = (dayName, rowIndex, colIndex, text, branch) => {
    setCancelSlotPos({ row: rowIndex, col: colIndex });
    setCancelSlotInfo(`${dayName}: ${text}${branch ? ` (${branch})` : ""}`);
    setCancelSlotOpen(true);
  };

  const closeCancelSlot = () => {
    setCancelSlotOpen(false);
  };

  const confirmCancelSlot = () => {
    if (cancelSlotPos) {
      const { row, col } = cancelSlotPos;
      setSchedule((prev) =>
        prev.map((scheduleRow, rowIdx) =>
          rowIdx !== row
            ? scheduleRow
            : scheduleRow.map((cell, colIdx) => (colIdx !== col ? cell : ["+", "empty"]))
        )
      );
    }

    setCancelSlotOpen(false);
    showAlert(`Slot cancelled: ${cancelSlotInfo}`);
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#172033] font-[Inter,Arial,sans-serif]">

      {/* HEADER */}
      <header className="h-14 bg-white border-b border-[#edf0f4] flex items-center px-[18px]">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 border-0 bg-transparent text-[#343943] text-sm cursor-pointer"
        >
          <span className="text-[25px] leading-none">‹</span>
          Doctors
        </button>
      </header>

      <main className="w-full max-w-[1045px] mx-auto p-4">

        {/* DOCTOR PROFILE */}
        <section className="bg-white border border-[#edf0f4] rounded-[10px] p-4 flex gap-[18px] mb-4 max-[700px]:flex-col">

          <div className="w-32 h-32 rounded-lg overflow-hidden shrink-0 bg-gray-200 max-[700px]:w-[105px] max-[700px]:h-[105px]">
            <img
              src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=500&q=80"
              alt="Doctor"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1">

            <div className="flex justify-between items-start max-[700px]:flex-col max-[700px]:gap-[15px]">

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-[#182235] max-[500px]:text-lg">
                    Dr. John Smith
                  </h1>

                  <span className="inline-flex items-center gap-[5px] bg-[#edf5ff] text-[#2266c8] border border-[#d5e6ff] px-[9px] py-1 rounded-full text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2675df]" />
                    Cardiology
                  </span>
                </div>

                <p className="mt-[5px] text-[#707784] text-[13px]">
                  MBBS, M.D, Cardiology
                </p>
              </div>

              <button
                onClick={() => showAlert("Book Appointment clicked")}
                className="border-0 bg-[#004a91] hover:bg-[#003b75] text-white px-[17px] py-[11px] rounded-[7px] text-[13px] font-semibold cursor-pointer max-[700px]:w-full"
              >
                Book Appointment
              </button>

            </div>

            <div className="mt-[21px] flex flex-col gap-3 text-[13px]">

              <div className="text-[#555e6d]">
                <span className="mr-1.5">▣</span>
                Hospital : Central Hospital
                (Tambaram, Egmore, Saidapet)
              </div>

              <div className="text-[#0b955e] flex items-center gap-[7px]">
                <span className="w-2 h-2 rounded-full bg-[#16a866]" />
                Available
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
              ["▣", "Medical Licence Number", "ML566659898"],
              ["⌕", "Phone Number", "+91 90020 90456"],
              ["✉", "Email", "john@example.com"],
              ["⌖", "Location", "4150 Hiney Road, Las Vegas, NV 89109"],
              ["▣", "DOB", "25 Jan 1990"],
              ["♧", "Blood group", "A1B+"],
              ["⚥", "Gender", "Male"],
              ["▣", "Experience", "12+yrs"],
            ].map(([icon, title, value]) => (
              <div
                key={title}
                className="flex items-start gap-3"
              >
                <div className="w-[23px] h-[23px] flex items-center justify-center text-[17px] text-gray-900 shrink-0">
                  {icon}
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
            Dr. John Smith has extensive experience in managing chronic
            illnesses, preventive care, and treating a wide range of medical
            conditions for patients of all ages.
          </p>
        </section>

        {/* TABS */}
        <div className="h-[39px] flex justify-center items-center gap-[42px]">

          {["day", "week"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
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
                    onClick={previousWeek}
                    className="border-0 bg-transparent text-[#555e6c] text-xs cursor-pointer"
                  >
                    ‹ Previous week
                  </button>

                  <button
                    onClick={() => showAlert("Next week selected")}
                    className="border-0 bg-transparent text-[#555e6c] text-xs cursor-pointer"
                  >
                    Next week ›
                  </button>

                  <button
                    onClick={() => openAddSlot("")}
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

                    {WEEK_DAYS.map(([day], dayIdx) => (
                      <div
                        key={day}
                        className="min-h-[43px] p-[7px_3px] border-r border-[#b9bfcb] text-center text-[#003b80] text-[8px] font-bold"
                      >
                        {day}
                        <small className="block mt-[3px] text-[7px]">
                          {weekDates[dayIdx]}
                        </small>
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
                              onClick={() => openAddSlot(WEEK_DAYS[index][0], rowIndex, index)}
                              className="h-[54px] border border-dashed border-[#b9bfcb] rounded flex items-center justify-center text-[#7d8794] text-lg cursor-pointer hover:border-[#004a91] hover:text-[#004a91]"
                            >
                              +
                            </div>
                          )}

                          {["green", "blue", "orange"].includes(type) && (
                            <div
                              onClick={() =>
                                openCancelSlot(WEEK_DAYS[index][0], rowIndex, index, text, branch)
                              }
                              className={`cursor-pointer h-[54px] rounded-[3px] p-[5px] flex flex-col justify-between overflow-hidden border-l-[3px] ${
                                type === "green"
                                  ? "bg-[#f0faf6] text-[#087d53] border-[#087d53]"
                                  : type === "blue"
                                  ? "bg-[#f1f6ff] text-[#1e5fc7] border-[#1e5fc7]"
                                  : "bg-[#fff7ef] text-[#ed741b] border-[#ed741b]"
                              }`}
                            >
                              <strong className="text-[7px] whitespace-nowrap">
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

                    <input
                      name="from"
                      type="date"
                      className="w-full border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                      TO
                    </label>

                    <input
                      name="to"
                      type="date"
                      className="w-full border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                    />
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

            {/* CALENDAR */}
            <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[25px] mb-6 max-[900px]:mb-0 max-[700px]:mb-5">

              <div className="flex items-center justify-between mb-[22px]">

                <button
                  onClick={() => showAlert("Previous month")}
                  className="border-0 bg-transparent text-[#9ca3af] text-2xl cursor-pointer"
                >
                  ‹
                </button>

                <h3 className="text-[15px]">
                  May 2026
                </h3>

                <button
                  onClick={() => showAlert("Next month")}
                  className="border-0 bg-transparent text-[#9ca3af] text-2xl cursor-pointer"
                >
                  ›
                </button>

              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">

                {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((day) => (
                  <span
                    key={day}
                    className="text-center text-[#9ca3af] text-[8px] font-bold"
                  >
                    {day}
                  </span>
                ))}

              </div>

              <div className="grid grid-cols-7 gap-2">

                {calendarDays.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedDay(item.day)}
                    className={`w-[31px] h-[31px] flex items-center justify-center rounded-full text-[11px] mx-auto border-0 cursor-pointer ${
                      item.muted
                        ? "text-[#c8ced7] bg-transparent"
                        : selectedDay === item.day
                        ? "bg-[#2167d5] text-white"
                        : "text-[#596273] bg-transparent hover:bg-[#e8f0ff]"
                    }`}
                  >
                    {item.day}
                  </button>
                ))}

              </div>

            </section>

            {/* REVIEWS */}
            <section className="bg-white border border-[#edf0f4] rounded-lg overflow-hidden">

              {[
                {
                  name: "John Doe",
                  time: "2 days ago",
                  image: "https://i.pravatar.cc/100?img=12",
                  rating: "★★★★★",
                  text: `"Dr was extremely professional and thorough during my cardiology consultation and explained the diagnosis in a way that was easy to understand and took the time to answer all my questions."`,
                  tags: ["Consultation", "Follow-up"],
                },
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

      {addSlotOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-[10px] p-6 w-[300px] shadow-lg">
            <h3 className="text-[16px] font-semibold text-[#172033] mb-2">
              Add Slot
            </h3>

            <p className="text-[#5f6672] text-[13px] mb-4">
              {addSlotDay ? `Add a new slot for ${addSlotDay}` : "Add a new slot"}
            </p>

            <div className="flex flex-col gap-3 mb-6">
              <div>
                <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                  START TIME
                </label>

                <input
                  type="time"
                  value={slotStart}
                  onChange={(e) => setSlotStart(e.target.value)}
                  className="w-full border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                />
              </div>

              <div>
                <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                  END TIME
                </label>

                <input
                  type="time"
                  value={slotEnd}
                  onChange={(e) => setSlotEnd(e.target.value)}
                  className="w-full border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                />
              </div>

              <div>
                <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                  BRANCH LOCATION
                </label>

                <select
                  value={slotBranch}
                  onChange={(e) => setSlotBranch(e.target.value)}
                  className="w-full border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                >
                  <option value="">Select branch</option>
                  {BRANCH_LOCATIONS.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeAddSlot}
                className="h-9 px-4 rounded-[7px] text-[13px] font-semibold cursor-pointer bg-white text-[#555e6c] border border-[#dfe4ea]"
              >
                Back
              </button>

              <button
                onClick={confirmAddSlot}
                className="h-9 px-4 rounded-[7px] text-[13px] font-semibold cursor-pointer bg-[#004a91] text-white border-0"
              >
                Add Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelSlotOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-[10px] p-6 w-[300px] shadow-lg">
            <h3 className="text-[16px] font-semibold text-[#172033] mb-2">
              Cancel Slot
            </h3>

            <p className="text-[#5f6672] text-[13px] mb-6">
              Cancel this slot for {cancelSlotInfo}?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeCancelSlot}
                className="h-9 px-4 rounded-[7px] text-[13px] font-semibold cursor-pointer bg-white text-[#555e6c] border border-[#dfe4ea]"
              >
                Back
              </button>

              <button
                onClick={confirmCancelSlot}
                className="h-9 px-4 rounded-[7px] text-[13px] font-semibold cursor-pointer bg-[#ff453a] text-white border-0"
              >
                Cancel Slot
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}