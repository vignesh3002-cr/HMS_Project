import { forwardRef, useImperativeHandle, useState } from "react";
import { Loader2 } from "lucide-react";
import TimepickerWheel from "@/components/ui/timepicker-wheel";

export interface ScheduleSlotBranchOption {
  branch_id: string;
  branch_name: string;
}

// "weekly"  -> repeating template row (effective_from/effective_to = null)
// "date"    -> day-specific row (effective_from = effective_to = date)
export type ScheduleSlotMode = "weekly" | "date";

// Date-specific schedule change type (doctor_schedule_change.mode).
export type SlotChangeMode = "ADD" | "OVERRIDE" | "CANCEL";

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
  mode: ScheduleSlotMode;
  effectiveDate?: string;
  consultationMinutes?: string;
  transferReason?: string;
  departmentId?: string;
  changeMode?: SlotChangeMode;
}

export interface ScheduleSlotEditPayload {
  scheduleId: string | number;
  day: string;
  date: string;
  row: number | null;
  col: number | null;
  branchId: string;
  branchName: string;
  startTime: string;
  endTime: string;
  timeLabel: string;
  mode: ScheduleSlotMode;
  effectiveDate?: string;
  consultationMinutes?: string | number | null;
  transferReason?: string;
  departmentId?: string;
  changeMode?: SlotChangeMode;
  changeId?: string | number | null;
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
  changeId?: string | number | null;
  changeMode?: SlotChangeMode;
  info: string;
}

export interface ScheduleSlotModalHandle {
  openAddSlot: (
    dayName?: string,
    rowIndex?: number | null,
    colIndex?: number | null,
    mode?: ScheduleSlotMode,
    date?: string,
    changeMode?: SlotChangeMode,
  ) => void;
  openEditSlot: (payload: Omit<ScheduleSlotEditPayload, "row" | "col">) => void;
  openCancelSlot: (
    dayName: string,
    rowIndex: number,
    colIndex: number,
    text: string,
    branch?: string,
    scheduleId?: string | number | null,
    changeId?: string | number | null,
    changeMode?: SlotChangeMode,
  ) => void;
}

interface ScheduleSlotModalProps {
  branches?: ScheduleSlotBranchOption[];
  departments?: { department_id: string; department_name: string }[];
  defaultConsultationMinutes?: number;
  defaultDepartmentId?: string;
  defaultBranchId?: string;
  hideDate?: boolean;
  onAddSlot: (payload: ScheduleSlotAddPayload) => Promise<boolean> | boolean;
  onUpdateSlot?: (payload: ScheduleSlotEditPayload) => Promise<boolean> | boolean;
  onCancelSlot: (payload: ScheduleSlotCancelPayload) => void;
  isSubmitting?: boolean;
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
  function ScheduleSlotModal(
    { branches, departments = [], defaultConsultationMinutes = 20, defaultDepartmentId = "", defaultBranchId = "", hideDate = false, onAddSlot, onUpdateSlot, onCancelSlot, isSubmitting = false },
    ref,
  ) {
    const [addSlotOpen, setAddSlotOpen] = useState(false);
    const [addSlotDay, setAddSlotDay] = useState("");
    const [addSlotPos, setAddSlotPos] = useState<{ row: number; col: number } | null>(null);
    const [slotDate, setSlotDate] = useState(() => toDateInputValue(new Date()));
    const [slotStart, setSlotStart] = useState("");
    const [slotEnd, setSlotEnd] = useState("");
    const [slotBranch, setSlotBranch] = useState("");
    const [slotMode, setSlotMode] = useState<ScheduleSlotMode>("weekly");
    const [slotChangeMode, setSlotChangeMode] = useState<SlotChangeMode | undefined>(undefined);
    const [slotDepartment, setSlotDepartment] = useState("");
    const [slotEffectiveDate, setSlotEffectiveDate] = useState(() => toDateInputValue(new Date()));
    const [slotConsultationMinutes, setSlotConsultationMinutes] = useState("");
    const [slotTransferReason, setSlotTransferReason] = useState("");
    const [editingScheduleId, setEditingScheduleId] = useState<string | number | null>(null);
    const [editingChangeId, setEditingChangeId] = useState<string | number | null>(null);
    const [cancelSlotOpen, setCancelSlotOpen] = useState(false);
    const [cancelSlotPos, setCancelSlotPos] = useState<{ row: number; col: number } | null>(null);
    const [cancelSlotInfo, setCancelSlotInfo] = useState("");
    const [cancelScheduleId, setCancelScheduleId] = useState<string | number | null>(null);
    const [cancelChangeId, setCancelChangeId] = useState<string | number | null>(null);
    const [cancelChangeMode, setCancelChangeMode] = useState<SlotChangeMode | undefined>(undefined);

    const branchOptions = branches ?? [];

    useImperativeHandle(ref, () => ({
      openAddSlot: (dayName = "", rowIndex = null, colIndex = null, mode = "weekly", date, changeMode) => {
        setEditingScheduleId(null);
        setEditingChangeId(null);
        setAddSlotDay(dayName);
        setAddSlotPos(rowIndex === null || colIndex === null ? null : { row: rowIndex, col: colIndex });
        setSlotDate(date || toDateInputValue(new Date()));
        setSlotStart("");
        setSlotEnd("");
        setSlotBranch(defaultBranchId ?? "");
        setSlotMode(mode);
        setSlotChangeMode(changeMode);
        setSlotDepartment(defaultDepartmentId ?? "");
        setSlotEffectiveDate(date || toDateInputValue(new Date()));
        setSlotConsultationMinutes(String(defaultConsultationMinutes));
        setSlotTransferReason("");
        setAddSlotOpen(true);
      },
      openEditSlot: ({ scheduleId, day, date, branchId, startTime, endTime, mode, departmentId, consultationMinutes, changeMode, changeId }) => {
        setEditingScheduleId(scheduleId);
        setEditingChangeId(changeId ?? null);
        setAddSlotDay(day);
        setAddSlotPos(null);
        setSlotDate(date || toDateInputValue(new Date()));
        setSlotStart(startTime);
        setSlotEnd(endTime);
        setSlotBranch(branchId);
        setSlotMode(mode);
        setSlotChangeMode(changeMode);
        setSlotDepartment(departmentId ?? "");
        setSlotEffectiveDate(date || toDateInputValue(new Date()));
        setSlotConsultationMinutes(
          consultationMinutes != null ? String(consultationMinutes) : String(defaultConsultationMinutes),
        );
        setSlotTransferReason("");
        setAddSlotOpen(true);
      },
      openCancelSlot: (dayName, rowIndex, colIndex, text, branch, scheduleId = null, changeId = null, changeMode) => {
        setCancelSlotPos({ row: rowIndex, col: colIndex });
        setCancelSlotInfo(`${dayName}: ${text}${branch ? ` (${branch})` : ""}`);
        setCancelScheduleId(scheduleId);
        setCancelChangeId(changeId);
        setCancelChangeMode(changeMode);
        setCancelSlotOpen(true);
      },
    }));

    const closeAddSlot = () => {
      setAddSlotOpen(false);
    };

    const confirmAddSlot = async () => {
      const isCancelChange = slotMode === "date" && slotChangeMode === "CANCEL";

      if (!addSlotDay || !slotDate || !slotBranch) {
        alert("Please select day, date and branch location.");
        return;
      }
      if (!isCancelChange && (!slotStart || !slotEnd)) {
        alert("Please select start time and end time.");
        return;
      }

      const selectedBranch = branchOptions.find((b) => b.branch_id === slotBranch);
      const timeLabel = `${formatTime12(slotStart)} - ${formatTime12(slotEnd)}`;

      const base = {
        day: addSlotDay,
        date: hideDate ? "" : slotDate,
        row: addSlotPos?.row ?? null,
        col: addSlotPos?.col ?? null,
        branchId: slotBranch,
        branchName: selectedBranch?.branch_name ?? "",
        startTime: isCancelChange ? "" : slotStart,
        endTime: isCancelChange ? "" : slotEnd,
        timeLabel,
        mode: slotMode,
        changeMode: slotChangeMode,
      };

      if (editingScheduleId !== null) {
        const ok = await onUpdateSlot?.({
          ...base,
          scheduleId: editingScheduleId,
          changeId: editingChangeId,
          effectiveDate: slotEffectiveDate,
          consultationMinutes: slotConsultationMinutes,
          transferReason: slotTransferReason.trim(),
          departmentId: slotDepartment,
        });
        if (ok === false) return;
      } else {
        const ok = await onAddSlot?.({
          ...base,
          effectiveDate: slotEffectiveDate,
          consultationMinutes: slotConsultationMinutes,
          transferReason: slotTransferReason.trim(),
          departmentId: slotDepartment,
        });
        if (ok === false) return;
      }

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
          changeId: cancelChangeId,
          changeMode: cancelChangeMode,
          info: cancelSlotInfo,
        });
      }

      setCancelSlotOpen(false);
    };

    return (
      <>
        {addSlotOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-[10px] p-6 w-[340px] max-h-[90vh] overflow-y-auto shadow-lg">
              <h3 className="text-[16px] font-semibold text-[#172033] mb-2">
                {editingScheduleId !== null ? "Edit Slot" : "Add Slot"}
              </h3>

              <p className="text-[#5f6672] text-[13px] mb-4">
                {addSlotDay ? `${editingScheduleId !== null ? "Edit" : "Add a new"} slot for ${addSlotDay}` : "Add a new slot"}
              </p>

              {/* Weekly vs Specific date toggle */}
              <div className="flex gap-2 mb-4">
                {(["weekly", "date"] as ScheduleSlotMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSlotMode(m)}
                    className={`flex-1 py-2 rounded-[7px] text-[11px] font-semibold border transition-colors ${
                      slotMode === m
                        ? "bg-[#004a91] text-white border-[#004a91]"
                        : "bg-white text-[#555e6c] border-[#dfe4ea]"
                    }`}
                  >
                    {m === "weekly" ? "Recurring weekly" : "Specific date"}
                  </button>
                ))}
              </div>

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

                {slotMode === "date" && (
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
                )}

                {slotMode === "date" && (
                  <div>
                    <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                      CHANGE TYPE
                    </label>

                    <div className="flex gap-2">
                      {(["ADD", "OVERRIDE", "CANCEL"] as SlotChangeMode[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSlotChangeMode(m)}
                          className={`flex-1 py-2 rounded-[7px] text-[11px] font-semibold border transition-colors ${
                            slotChangeMode === m
                              ? m === "CANCEL"
                                ? "bg-[#ff453a] text-white border-[#ff453a]"
                                : m === "OVERRIDE"
                                ? "bg-[#b45309] text-white border-[#b45309]"
                                : "bg-[#087d53] text-white border-[#087d53]"
                              : "bg-white text-[#555e6c] border-[#dfe4ea]"
                          }`}
                        >
                          {m === "ADD" ? "Add" : m === "OVERRIDE" ? "Override" : "Cancel"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!(slotMode === "date" && slotChangeMode === "CANCEL") && (
                  <>
                    <div>
                      <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                        START TIME
                      </label>

                      <TimepickerWheel
                        value={slotStart}
                        onChange={setSlotStart}
                        placeholder="Start time"
                        disabled={isSubmitting}
                        className="w-full rounded-[7px] border-[#dfe4ea] text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                        END TIME
                      </label>

                      <TimepickerWheel
                        value={slotEnd}
                        onChange={setSlotEnd}
                        placeholder="End time"
                        disabled={isSubmitting}
                        className="w-full rounded-[7px] border-[#dfe4ea] text-xs"
                      />
                    </div>
                  </>
                )}

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

                {!(slotMode === "date" && slotChangeMode === "CANCEL") && (
                  <>
                    <div>
                      <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                        DEPARTMENT
                      </label>

                      <select
                        value={slotDepartment}
                        onChange={(e) => setSlotDepartment(e.target.value)}
                        className="w-full border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                      >
                        <option value="">Select department</option>
                        {departments.map((d) => (
                          <option key={d.department_id} value={d.department_id}>
                            {d.department_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                        EFFECTIVE DATE
                      </label>

                      <input
                        type="date"
                        min={toDateInputValue(new Date())}
                        value={slotEffectiveDate}
                        onChange={(e) => setSlotEffectiveDate(e.target.value)}
                        className="w-full border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                        CONSULTATION MINUTES
                      </label>

                      <input
                        type="number"
                        min={1}
                        value={slotConsultationMinutes}
                        onChange={(e) => setSlotConsultationMinutes(e.target.value)}
                        className="w-full border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#99a1ac] text-[9px] font-bold mb-[5px]">
                        TRANSFER REASON
                      </label>

                      <textarea
                        rows={2}
                        value={slotTransferReason}
                        onChange={(e) => setSlotTransferReason(e.target.value)}
                        placeholder="Why is this slot being changed?"
                        className="w-full resize-y border border-[#dfe4ea] rounded-[7px] outline-none p-[10px_12px] text-xs text-[#374151] focus:border-[#004a91]"
                      />
                    </div>
                  </>
                )}
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
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-[7px] text-[13px] font-semibold cursor-pointer bg-[#004a91] text-white border-0 inline-flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {editingScheduleId !== null ? "Updating..." : "Adding..."}
                    </>
                  ) : editingScheduleId !== null ? (
                    "Update Slot"
                  ) : (
                    "Add Slot"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {cancelSlotOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-[10px] p-6 w-[300px] shadow-lg">
              <h3 className="text-[16px] font-semibold text-[#172033] mb-2">
                {cancelChangeId != null ? "Remove Date Change" : "Cancel Slot"}
              </h3>

              <p className="text-[#5f6672] text-[13px] mb-6">
                {cancelChangeId != null
                  ? `Remove this date change for ${cancelSlotInfo}?`
                  : `Cancel this slot for ${cancelSlotInfo}?`}
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