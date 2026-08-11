import { forwardRef, useImperativeHandle, useState } from "react";

export interface ScheduleSlotBranchOption {
  branch_id: string;
  branch_name: string;
}

export interface ScheduleSlotAddPayload {
  day: string;
  date: string;
  row: number | null;
  col: number | null;
  branchId: string;
  branchName: string;
  startTime: string;
  endTime: string;
  timeLabel: string;
}

const WEEK_DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const toDateInputValue = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export interface ScheduleSlotCancelPayload {
  row: number;
  col: number;
  scheduleId: string | number | null;
  info: string;
}

export interface ScheduleSlotModalHandle {
  openAddSlot: (dayName?: string, rowIndex?: number | null, colIndex?: number | null) => void;
  openCancelSlot: (
    dayName: string,
    rowIndex: number,
    colIndex: number,
    text: string,
    branch?: string,
    scheduleId?: string | number | null,
  ) => void;
}

interface ScheduleSlotModalProps {
  branches?: ScheduleSlotBranchOption[];
  onAddSlot: (payload: ScheduleSlotAddPayload) => void;
  onCancelSlot: (payload: ScheduleSlotCancelPayload) => void;
}

const formatTime12 = (time: string) => {
  if (!time) return "";
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, "0")}:${minuteStr} ${period}`;
};

const ScheduleSlotModal = forwardRef<ScheduleSlotModalHandle, ScheduleSlotModalProps>(
  function ScheduleSlotModal({ branches, onAddSlot, onCancelSlot }, ref) {
    const [addSlotOpen, setAddSlotOpen] = useState(false);
    const [addSlotDay, setAddSlotDay] = useState("");
    const [addSlotPos, setAddSlotPos] = useState<{ row: number; col: number } | null>(null);
    const [slotDate, setSlotDate] = useState(() => toDateInputValue(new Date()));
    const [slotStart, setSlotStart] = useState("");
    const [slotEnd, setSlotEnd] = useState("");
    const [slotBranch, setSlotBranch] = useState("");
    const [cancelSlotOpen, setCancelSlotOpen] = useState(false);
    const [cancelSlotPos, setCancelSlotPos] = useState<{ row: number; col: number } | null>(null);
    const [cancelSlotInfo, setCancelSlotInfo] = useState("");
    const [cancelScheduleId, setCancelScheduleId] = useState<string | number | null>(null);

    const branchOptions = branches ?? [];

    useImperativeHandle(ref, () => ({
      openAddSlot: (dayName = "", rowIndex = null, colIndex = null) => {
        setAddSlotDay(dayName);
        setAddSlotPos(rowIndex === null || colIndex === null ? null : { row: rowIndex, col: colIndex });
        setSlotDate(toDateInputValue(new Date()));
        setSlotStart("");
        setSlotEnd("");
        setSlotBranch("");
        setAddSlotOpen(true);
      },
      openCancelSlot: (dayName, rowIndex, colIndex, text, branch, scheduleId = null) => {
        setCancelSlotPos({ row: rowIndex, col: colIndex });
        setCancelSlotInfo(`${dayName}: ${text}${branch ? ` (${branch})` : ""}`);
        setCancelScheduleId(scheduleId);
        setCancelSlotOpen(true);
      },
    }));

    const closeAddSlot = () => {
      setAddSlotOpen(false);
    };

    const confirmAddSlot = () => {
      if (!addSlotDay || !slotDate || !slotStart || !slotEnd || !slotBranch) {
        alert("Please select day, date, start time, end time and branch location.");
        return;
      }

      const selectedBranch = branchOptions.find((b) => b.branch_id === slotBranch);
      const timeLabel = `${formatTime12(slotStart)} - ${formatTime12(slotEnd)}`;

      onAddSlot({
        day: addSlotDay,
        date: slotDate,
        row: addSlotPos?.row ?? null,
        col: addSlotPos?.col ?? null,
        branchId: slotBranch,
        branchName: selectedBranch?.branch_name ?? "",
        startTime: slotStart,
        endTime: slotEnd,
        timeLabel,
      });

      setAddSlotOpen(false);
    };

    const closeCancelSlot = () => {
      setCancelSlotOpen(false);
    };

    const confirmCancelSlot = () => {
      if (cancelSlotPos) {
        onCancelSlot({
          row: cancelSlotPos.row,
          col: cancelSlotPos.col,
          scheduleId: cancelScheduleId,
          info: cancelSlotInfo,
        });
      }

      setCancelSlotOpen(false);
    };

    return (
      <>
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
                    DAY
                  </label>

                  <select
                    value={addSlotDay}
                    onChange={(e) => setAddSlotDay(e.target.value)}
                    className="w-full border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                  >
                    <option value="">Select day</option>
                    {WEEK_DAY_OPTIONS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                    DATE
                  </label>

                  <input
                    type="date"
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    className="w-full border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                  />
                </div>

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
                    {branchOptions.map((branch) => (
                      <option key={branch.branch_id} value={branch.branch_id}>
                        {branch.branch_name}
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
      </>
    );
  },
);

export default ScheduleSlotModal;
