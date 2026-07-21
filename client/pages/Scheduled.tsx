import { useState } from "react";

const weekDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const slots = [
  [
    { time: "10:30 AM - 12:30 PM", hospital: "Tambaram", color: "green" },
    { time: "10:30 AM - 12:30 PM", hospital: "Egmore", color: "blue" },
    { time: "09:30 AM - 11:30 AM", hospital: "Tambaram", color: "green" },
    { time: "09:30 AM - 11:30 AM", hospital: "Saidapet", color: "orange" },
    { time: "09:30 AM - 11:30 AM", hospital: "Saidapet", color: "orange" },
    { weekOff: true },
    { time: "06:00 PM - 09:00 PM", hospital: "Saidapet", color: "orange" },
  ],

  [
    { time: "02:30 PM - 04:30 PM", hospital: "Egmore", color: "blue" },
    { time: "01:00 PM - 03:00 PM", hospital: "Saidapet", color: "orange" },
    { time: "06:00 PM - 09:00 PM", hospital: "Saidapet", color: "orange" },
    { time: "02:00 PM - 05:30 PM", hospital: "Tambaram", color: "green" },
    { time: "04:00 PM - 06:00 PM", hospital: "Tambaram", color: "green" },
    { weekOff: true },
    {},
  ],

  [
    { time: "06:30 PM - 09:30 PM", hospital: "Tambaram", color: "green" },
    { time: "07:00 PM - 09:30 PM", hospital: "Egmore", color: "blue" },
    {},
    { time: "07:00 PM - 09:30 PM", hospital: "Egmore", color: "blue" },
    {},
    { weekOff: true },
    {},
  ],

  [{}, {}, {}, {}, {}, {}, {}],
] as { time?: string; hospital?: string; color?: string; weekOff?: boolean }[][];

const reviews = [
  {
    id: 1,
    name: "John Doe",
    date: "2 days ago",
    rating: 5,
    review:
      "Dr. John Smith was extremely professional and thorough during my cardiology consultation. He explained everything clearly and answered all of my questions.",
    tags: ["Consultation", "Follow-up"],
    avatar: "https://i.pravatar.cc/150?img=1",
  },
  {
    id: 2,
    name: "Sarah Jenkins",
    date: "1 week ago",
    rating: 4,
    review:
      "Very knowledgeable doctor. The appointment was well organized and I felt comfortable throughout the consultation.",
    tags: ["Cardiology", "Checkup"],
    avatar: "https://i.pravatar.cc/150?img=5",
  },
  {
    id: 3,
    name: "David Wilson",
    date: "2 weeks ago",
    rating: 5,
    review:
      "Excellent service. Highly recommended for anyone looking for a heart specialist.",
    tags: ["Emergency", "Treatment"],
    avatar: "https://i.pravatar.cc/150?img=8",
  },
];

const DoctorProfile = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"Day" | "Week">("Day");

  const aboutItems = [
    {
      title: "Medical Licence Number",
      value: "ML566659898",
      icon: "🩺",
    },
    {
      title: "Phone Number",
      value: "+91 90020 90456",
      icon: "📞",
    },
    {
      title: "Email",
      value: "john@example.com",
      icon: "✉️",
    },
    {
      title: "Location",
      value: "4150 Hiney Road, Las Vegas, NV 89109",
      icon: "📍",
    },
    {
      title: "DOB",
      value: "25 Jan 1990",
      icon: "📅",
    },
    {
      title: "Blood Group",
      value: "A1B+",
      icon: "🩸",
    },
    {
      title: "Gender",
      value: "Male",
      icon: "👤",
    },
    {
      title: "Experience",
      value: "12+ Years",
      icon: "⭐",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ================= Header ================= */}

      <header className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm">

        <div className="flex items-center gap-3">

          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            🏥
          </div>

          <h2 className="font-semibold text-slate-700">
            Main Branch
          </h2>

        </div>

        <button
          className="lg:hidden rounded border p-2"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>

        <div
          className={`${
            menuOpen ? "flex" : "hidden"
          } lg:flex items-center gap-5`}
        >
          <button className="relative">
            🔔
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-600"></span>
          </button>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-blue-900">
              HMS
            </span>

            <img
              src="https://i.pravatar.cc/100"
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          </div>
        </div>
      </header>

      {/* ================= Breadcrumb ================= */}

      <div className="border-b bg-white px-6 py-4">

        <button className="flex items-center gap-2 text-slate-600">

          ←

          <span>Doctors</span>

        </button>

      </div>

      <div className="mx-auto max-w-7xl space-y-6 p-6">

        {/* ================= Profile ================= */}

        <div className="rounded-xl border bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-6 lg:flex-row">

            <img
              src="https://i.pravatar.cc/200"
              alt=""
              className="h-36 w-36 rounded-lg object-cover"
            />

            <div className="flex-1">

              <div className="flex flex-wrap items-center gap-3">

                <h1 className="text-3xl font-bold">
                  Dr. John Smith
                </h1>

                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700">
                  Cardiology
                </span>

              </div>

              <p className="mt-2 text-gray-500">
                MBBS, MD Cardiology
              </p>

              <div className="mt-6 space-y-3">

                <div>
                  🏥 Central Hospital
                  (Tambaram, Egmore, Saidapet)
                </div>

                <div className="flex items-center gap-2">

                  <span className="h-3 w-3 rounded-full bg-green-500"></span>

                  <span className="font-medium text-green-700">
                    Available
                  </span>

                </div>

              </div>

            </div>

            <button className="rounded-lg bg-blue-900 px-8 py-3 font-semibold text-white hover:bg-blue-800">
              Book Appointment
            </button>

          </div>

        </div>

        {/* ================= About ================= */}

        <div className="relative rounded-xl border bg-white p-6 shadow-sm">

          <div className="mb-8 flex items-center justify-between">

            <h2 className="text-2xl font-bold">
              About
            </h2>

            <button className="text-blue-700 underline">
              View More
            </button>

          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

            {aboutItems.map((item) => (
              <div
                key={item.title}
                className="flex gap-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-xl">
                  {item.icon}
                </div>

                <div>

                  <h3 className="font-semibold">
                    {item.title}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {item.value}
                  </p>

                </div>

              </div>
            ))}

          </div>

        </div>

        {/* ================= Short Bio ================= */}

        <div className="rounded-xl border bg-white p-6 shadow-sm">

          <h2 className="mb-4 text-2xl font-bold">
            Short Bio
          </h2>

          <p className="leading-8 text-gray-600">
            Dr. John Smith has extensive experience in
            managing chronic illnesses, preventive care,
            and treating a wide range of medical
            conditions for patients of all ages.
          </p>

        </div>

        {/* ================= Availability ================= */}

        <section className="space-y-6">

          {/* Tabs */}

          <div className="flex justify-center">

            <div className="flex rounded-lg bg-white p-1 shadow">

              {["Day", "Week"].map((tab) => (

                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as "Day" | "Week")}
                  className={`rounded-md px-8 py-2 text-sm font-semibold transition

                  ${
                    activeTab === tab
                      ? "bg-blue-900 text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {tab}
                </button>

              ))}

            </div>

          </div>

          {/* Availability */}

          <div className="rounded-xl border bg-white p-6 shadow">

            <div className="mb-6 flex items-center justify-between">

              <h2 className="text-2xl font-bold">
                Availability
              </h2>

              <button className="rounded-lg bg-blue-900 px-5 py-2 font-semibold text-white">
                + Add Slot
              </button>

            </div>

            <div className="overflow-x-auto">

              <div className="min-w-[900px]">

                {/* Week Header */}

                <div className="grid grid-cols-7">

                  {weekDays.map((day) => (

                    <div
                      key={day}
                      className="border bg-slate-100 p-3 text-center text-sm font-bold"
                    >
                      {day}
                    </div>

                  ))}

                </div>

                {/* Grid */}

                {slots.map((row, index) => (

                  <div
                    key={index}
                    className="grid grid-cols-7"
                  >

                    {row.map((slot, i) => (

                      <div
                        key={i}
                        className="border p-2 h-24"
                      >

                        {slot.weekOff ? (

                          <div className="flex h-full flex-col items-center justify-center rounded border-2 border-dashed text-xs text-gray-500">

                            Week Off

                          </div>

                        ) : slot.time ? (

                          <div
                            className={`rounded border-l-4 p-2 text-xs

                            ${
                              slot.color === "green"
                                ? "border-green-600 bg-green-50"
                                : slot.color === "blue"
                                ? "border-blue-600 bg-blue-50"
                                : "border-orange-500 bg-orange-50"
                            }`}
                          >

                            <div className="font-semibold">

                              {slot.time}

                            </div>

                            <div className="mt-2 text-gray-600">

                              {slot.hospital}

                            </div>

                          </div>

                        ) : (

                          <button className="flex h-full w-full items-center justify-center rounded border-2 border-dashed text-2xl text-gray-300 hover:bg-gray-50">

                            +

                          </button>

                        )}

                      </div>

                    ))}

                  </div>

                ))}

              </div>

            </div>

            {/* Footer */}

            <div className="mt-6 flex items-center justify-between border-t pt-5">

              <button className="text-gray-500">
                Clear
              </button>

              <div className="flex items-center gap-4">

                <span className="text-sm">
                  Apply changes for all weeks
                </span>

                <button className="relative h-6 w-11 rounded-full bg-gray-300">

                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white"></span>

                </button>

              </div>

            </div>

          </div>

        </section>

      </div>

    </div>
  );
};

export default DoctorProfile;