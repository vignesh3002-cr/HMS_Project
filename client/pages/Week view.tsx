import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ExportReport from "@/components/ui/ExportReport";

interface Schedule {
  patients: number;
  progress: number;
  color: "blue" | "green" | "red" | "gray";
  off?: boolean;
}

interface Doctor {
  name: string;
  department: string;
  schedule: Schedule[];
}

const initialDoctors: Doctor[] = [
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Sarah Johnson",
    department: "HEMATOLOGY",
    schedule: [
      { patients: 13, progress: 80, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 8, progress: 55, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 9, progress: 60, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Michael Brown",
    department: "RADIATION",
    schedule: [
      { patients: 16, progress: 100, color: "red" },
      { patients: 0, progress: 0, color: "gray", off: true },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 12, progress: 85, color: "blue" },
      { patients: 9, progress: 65, color: "blue" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
  {
    name: "Dr. Elena Rodriguez",
    department: "PEDIATRIC",
    schedule: [
      { patients: 6, progress: 40, color: "green" },
      { patients: 11, progress: 75, color: "blue" },
      { patients: 12, progress: 85, color: "blue" },
      { patients: 10, progress: 70, color: "blue" },
      { patients: 13, progress: 90, color: "blue" },
      { patients: 4, progress: 30, color: "gray" },
      { patients: 0, progress: 0, color: "gray", off: true },
    ],
  },
];

const colorStyles = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-700",
    text: "text-blue-700",
    fill: "bg-blue-700",
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-700",
    text: "text-green-700",
    fill: "bg-green-700",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-700",
    text: "text-red-700",
    fill: "bg-red-700",
  },
  gray: {
    bg: "bg-gray-100",
    border: "border-gray-500",
    text: "text-gray-600",
    fill: "bg-gray-500",
  },
};

const AppointmentSchedule = () => {
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ doctorIdx: number; colIdx: number } | null>(null);

  const handleAddSlot = () => {
    if (selectedSlot) {
      setDoctors((prev) =>
        prev.map((doctor, doctorIdx) =>
          doctorIdx !== selectedSlot.doctorIdx
            ? doctor
            : {
                ...doctor,
                schedule: doctor.schedule.map((item, colIdx) =>
                  colIdx !== selectedSlot.colIdx
                    ? item
                    : { patients: 0, progress: 0, color: "blue", off: false },
                ),
              },
        ),
      );
    }
    setIsAddSlotOpen(false);
    setSelectedSlot(null);
  };

  const handleCancelAddSlot = () => {
    setIsAddSlotOpen(false);
    setSelectedSlot(null);
  };

  const [isCancelSlotOpen, setIsCancelSlotOpen] = useState(false);

  const handleConfirmCancelSlot = () => {
    if (selectedSlot) {
      setDoctors((prev) =>
        prev.map((doctor, doctorIdx) =>
          doctorIdx !== selectedSlot.doctorIdx
            ? doctor
            : {
                ...doctor,
                schedule: doctor.schedule.map((item, colIdx) =>
                  colIdx !== selectedSlot.colIdx
                    ? item
                    : { patients: 0, progress: 0, color: "gray", off: true },
                ),
              },
        ),
      );
    }
    setIsCancelSlotOpen(false);
    setSelectedSlot(null);
  };

  const handleBackFromCancelSlot = () => {
    setIsCancelSlotOpen(false);
    setSelectedSlot(null);
  };

  const totalAppointments = doctors.reduce(
    (total, doctor) => total + doctor.schedule.filter((item) => !item.off).length,
    0,
  );

  return (
    <div className="flex w-full font-[Manrope,sans-serif] bg-[#F7F9FB] min-h-screen">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-col gap-6">

          {/* ==================== HEADER ==================== */}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">

        <div>
          <h1 className="hms-heading">
            Appointment Schedule
          </h1>

          <p className="hms-subheading mt-1">
            Total Appointments: {totalAppointments}
          </p>

        </div>


        <div className="flex items-center gap-3">
          <ExportReport />



          <button
            className="flex items-center gap-2 px-4 py-2 bg-[#004785] rounded-lg text-white text-xs font-semibold shadow-sm hover:bg-[#003a6b] transition-colors"
          >

            <Plus className="w-4 h-4" />
            Add Appointment

          </button>


        </div>


          </div>

          {/* ==================== MAIN CARD ==================== */}

          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col min-h-[500px] overflow-hidden transition-all duration-300 hover:shadow-md">

          {/* Toolbar */}

          <div className="px-5 py-4 border-b border-[#E5E7EB] flex flex-wrap items-end gap-4">

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
            View
          </p>

          <button className="flex h-10 w-40 items-center justify-between rounded-lg border border-gray-200 px-4 shadow-sm">
            Week View
            <ChevronDown size={16} />
          </button>
        </div>

        <div className="flex overflow-hidden rounded-lg border border-gray-200 shadow-sm">

          <button className="flex h-10 w-10 items-center justify-center">
            <ChevronLeft size={18} />
          </button>

          <button className="border-x px-5 text-sm font-medium">
            Today
          </button>

          <button className="flex h-10 w-10 items-center justify-center">
            <ChevronRight size={18} />
          </button>

        </div>

        <div className="flex-1"></div>

        <button className="flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">
          <Plus size={16} />
          New Appointment
        </button>

          </div>

          {/* Table */}

          <div className="overflow-auto flex-1">

            <table className="min-w-full border-collapse">

          <thead>

            <tr className="bg-[#f2f4f6] border-b border-[#c3c6d7]">

              <th className="border-r border-[#c3c6d7] px-4 py-3 text-left font-['Manrope',sans-serif] text-[10px] font-bold uppercase leading-[15px] text-[#515f74]">
                Specialist
              </th>

              {[
                "Mon 20",
                "Tue 21",
                "Wed 22",
                "Thu 23",
                "Fri 24",
                "Sat 25",
                "Sun 26",
              ].map((day) => (
                <th
                  key={day}
                  className="border-r border-[#c3c6d7] last:border-r-0 px-4 py-3 text-center font-['Manrope',sans-serif] text-[10px] font-bold uppercase leading-[15px] text-[#515f74]"
                >
                  {day}
                </th>
              ))}

            </tr>

          </thead>

          <tbody>

            {doctors.map((doctor, doctorIdx) => (
              <tr key={doctor.name + doctorIdx} className="border-b border-[#c3c6d7] last:border-b-0">
                <td className="border-r border-[#c3c6d7] bg-[rgba(242,244,246,0.5)] px-4 py-3 align-top">

                  <h3 className="font-['Manrope',sans-serif] text-[10px] font-bold leading-[15px] text-[#004ac6]">
                    {doctor.name}
                  </h3>

                  <p className="mt-1 font-['Manrope',sans-serif] text-[8px] font-bold uppercase leading-3 tracking-wide text-[#515f74]">
                    {doctor.department}
                  </p>

                </td>

                {doctor.schedule.map((item, index) => {
                  if (item.off) {
                    return (
                      <td
                        key={index}
                        className="border-r border-[#c3c6d7] last:border-r-0 p-1 align-middle"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSlot({ doctorIdx, colIdx: index });
                            setIsAddSlotOpen(true);
                          }}
                          className="flex h-[52px] w-full items-center justify-center rounded border border-dashed border-[#c3c6d7] transition-colors hover:border-[#00488D] hover:bg-[#F7F9FB]"
                        >
                          <span className="font-['Manrope',sans-serif] text-[9px] font-bold uppercase tracking-wide text-[#9aa1ad]">
                            OFF
                          </span>
                        </button>
                      </td>
                    );
                  }

                  if (item.patients === 0) {
                    return (
                      <td key={index} className="border-r border-[#c3c6d7] last:border-r-0 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSlot({ doctorIdx, colIdx: index });
                            setIsCancelSlotOpen(true);
                          }}
                          className="flex h-[52px] w-full items-center justify-center rounded-[2px] border-l-2 border-l-[#004ac6] bg-[rgba(0,74,198,0.05)] p-1 text-center transition-colors hover:bg-[rgba(0,74,198,0.1)]"
                        >
                          <span className="font-['Manrope',sans-serif] text-[9px] font-bold leading-[13px] text-[#004ac6]">
                            New slot available
                          </span>
                        </button>
                      </td>
                    );
                  }

                  const style = colorStyles[item.color];

                  return (
                    <td key={index} className="border-r border-[#c3c6d7] last:border-r-0 p-1">
                      <div
                        className={`flex h-[52px] w-full flex-col justify-between rounded-[2px] border-l-2 p-1 pl-1.5 ${style.bg} ${style.border}`}
                      >
                        <p className={`font-['Manrope',sans-serif] text-[10px] font-bold leading-[15px] ${style.text}`}>
                          {item.patients} Patients
                        </p>

                        <div className="relative block h-1 w-full overflow-hidden rounded-xl bg-[#e0e3e5]">
                          <div
                            className={`absolute inset-0 rounded-xl ${style.fill}`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

          </tbody>

        </table>

      </div>

          </div>
        </main>
      </div>

      <Dialog
        open={isAddSlotOpen}
        onOpenChange={(open) => {
          setIsAddSlotOpen(open);
          if (!open) setSelectedSlot(null);
        }}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Add Slot</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddSlot}
              className="flex-1 rounded-lg bg-[#004785] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#003a6b]"
            >
              Add Slot
            </button>
            <button
              type="button"
              onClick={handleCancelAddSlot}
              className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2 text-xs font-semibold text-[#374151] transition-colors hover:bg-[#F2F4F6]"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCancelSlotOpen}
        onOpenChange={(open) => {
          setIsCancelSlotOpen(open);
          if (!open) setSelectedSlot(null);
        }}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-black">Cancel Slot</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleConfirmCancelSlot}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
            >
              Cancel Slot
            </button>
            <button
              type="button"
              onClick={handleBackFromCancelSlot}
              className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2 text-xs font-semibold text-[#374151] transition-colors hover:bg-[#F2F4F6]"
            >
              Back
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentSchedule;