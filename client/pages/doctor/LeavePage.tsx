import React, { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, CheckCircle2, Loader2 } from "lucide-react";
import API from "@/api/axios";
import { BellNotificationButton } from "@/components/hms/BellNotificationButton";
import {
  doctorLeaveApi,
  type ApplyDoctorLeavePayload,
  type DoctorLeaveRecord,
} from "@/api/doctorLeave.api";
import { getUser } from "@/utils/token";
import {
  findLeaveConflictingAppointments,
  formatTimeOfDay,
  type LeaveConflict,
} from "@/utils/leaveConflicts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CalendarPicker from "@/components/hms/Calender";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type AbsenceType = "Emergency" | "Vacation" | "Sick Leave";

interface AbsenceTypeOption {
  name: AbsenceType;
  icon: string;
  className: string;
}

interface LoggedAbsenceRow {
  leaveId: string;
  type: string;
  duration: string;
  status: string;
  dateLogged: string;
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  PENDING: "bg-[#fff7ed] text-[#b45309]",
  APPROVED: "bg-[#f0fdf4] text-[#16a34a]",
  REJECTED: "bg-[#fef2f2] text-[#dc2626]",
};

function startOfToday(): Date {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
}

interface ChecklistState {
  handover: boolean;
  followups: boolean;
  emr: boolean;
  cover: boolean;
}

const AbsenceManagement: React.FC = () => {
  const [selectedType, setSelectedType] =
    useState<AbsenceType>("Emergency");

  const [startDate, setStartDate] =
    useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(
    null
  );
  const [
    isStartCalendarOpen,
    setIsStartCalendarOpen,
  ] = useState<boolean>(false);
  const [isEndCalendarOpen, setIsEndCalendarOpen] =
    useState<boolean>(false);
  const [handoverDetails, setHandoverDetails] =
    useState<string>("");

  const [checklist, setChecklist] =
    useState<ChecklistState>({
      handover: false,
      followups: false,
      emr: true,
      cover: false,
    });

  const [toast, setToast] = useState<string>("");

  const [leaveConfirmOpen, setLeaveConfirmOpen] =
    useState<boolean>(false);
  const [leaveSuccessOpen, setLeaveSuccessOpen] =
    useState<boolean>(false);
  const [submittingLeave, setSubmittingLeave] =
    useState<boolean>(false);
  const [leaveSuccessInfo, setLeaveSuccessInfo] = useState<{
    type: AbsenceType;
    from: string;
    to: string;
    leaveId?: string;
    queuedCount?: number;
    queueFailed?: boolean;
  } | null>(null);
  const [leaveConflicts, setLeaveConflicts] = useState<
    LeaveConflict[]
  >([]);
  const [leaveConflictsOpen, setLeaveConflictsOpen] =
    useState<boolean>(false);
  const employeeIdRef = useRef<string | null>(null);

  const absenceTypes: AbsenceTypeOption[] = [
    {
      name: "Emergency",
      icon: "https://www.figma.com/api/mcp/asset/f27ad97a-e294-4e2d-9324-2393879dceae.svg",
      className: "h-6 w-[23px]",
    },
    {
      name: "Vacation",
      icon: "https://www.figma.com/api/mcp/asset/d540afb8-df30-4b15-8f80-c10819746f2c.svg",
      className: "h-[27px] w-[27px]",
    },
    {
      name: "Sick Leave",
      icon: "https://www.figma.com/api/mcp/asset/d68dcd29-b02f-4d0b-98ff-31117d9f1eca.svg",
      className: "h-[27px] w-7",
    },
  ];

  const [absences, setAbsences] = useState<
    LoggedAbsenceRow[]
  >([]);
  const [absencesLoading, setAbsencesLoading] =
    useState<boolean>(true);

  /*
   * =========================================================
   * LOGGED ABSENCES HELPERS
   * =========================================================
   */

  const MONTHS_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const parseDateSafe = (
    value?: string | null
  ): Date | null => {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);

    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatDateLogged = (
    value?: string | null
  ): string => {
    const parsed = parseDateSafe(value);
    return parsed
      ? `${
          MONTHS_SHORT[parsed.getUTCMonth()]
        } ${parsed.getUTCDate()}, ${parsed.getUTCFullYear()}`
      : "-";
  };

  const deriveAbsenceType = (reason: string): string => {
    const lower = (reason || "").toLowerCase();

    if (lower.startsWith("emergency")) {
      return "Emergency";
    }

    if (lower.startsWith("vacation")) {
      return "Vacation";
    }

    if (lower.startsWith("sick")) {
      return "Sick Leave";
    }

    return "Leave";
  };

  const absenceIconByType = (type: string): string =>
    absenceTypes.find(
      (option: AbsenceTypeOption) =>
        option.name === type
    )?.icon ?? absenceTypes[0].icon;

  const formatDurationRange = (
    startValue: string,
    endValue: string
  ): string => {
    const start = parseDateSafe(startValue);
    const end = parseDateSafe(endValue);

    if (!start || !end) {
      return "-";
    }

    const days =
      Math.round(
        (end.getTime() - start.getTime()) / 86400000
      ) + 1;

    const startLabel = `${
      MONTHS_SHORT[start.getUTCMonth()]
    } ${start.getUTCDate()}`;

    const endLabel = `${
      MONTHS_SHORT[end.getUTCMonth()]
    } ${end.getUTCDate()}`;

    if (days <= 1) {
      return `${startLabel} (1 Day)`;
    }

    return `${startLabel} - ${endLabel} (${days} Days)`;
  };

  const toAbsenceRow = (
    leave: DoctorLeaveRecord
  ): LoggedAbsenceRow => ({
    leaveId: leave.leave_id,
    type: deriveAbsenceType(leave.leave_reason),
    duration: formatDurationRange(
      leave.leave_start_date,
      leave.leave_end_date
    ),
    status: leave.status,
    dateLogged: formatDateLogged(leave.requested_at),
  });

  const loadAbsences = useCallback(
    async (): Promise<void> => {
      try {
        setAbsencesLoading(true);

        const employeeId =
          await resolveEmployeeId();

        if (!employeeId) {
          setAbsences([]);
          return;
        }

        const response = await doctorLeaveApi.getAll({
          employee_id: employeeId,
          page: 1,
          limit: 50,
        });

        const leaves: DoctorLeaveRecord[] =
          response.data?.leaves ?? [];

        setAbsences(
          leaves.map(toAbsenceRow)
        );
      } catch {
        setAbsences([]);
      } finally {
        setAbsencesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadAbsences();
  }, [loadAbsences]);

  /*
   * =========================================================
   * TOAST
   * =========================================================
   */

  const showToast = (message: string): void => {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 2500);
  };

  /*
   * =========================================================
   * FORM SUBMIT
   * =========================================================
   */

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ): void => {
    event.preventDefault();

    if (!startDate) {
      showToast("Please select the start date.");
      return;
    }

    if (!endDate) {
      showToast("Please select the end date.");
      return;
    }

    if (endDate < startDate) {
      showToast("End date cannot be before start date.");
      return;
    }

    setLeaveConfirmOpen(true);
  };

  /*
   * =========================================================
   * LEAVE SUBMISSION (API)
   * =========================================================
   */

  const toIsoDate = (date: Date): string =>
    format(date, "yyyy-MM-dd");

  const resolveEmployeeId = async (): Promise<string | null> => {
    const stored = getUser()?.employee_id;

    if (stored) {
      return String(stored);
    }

    try {
      const response = await API.get<{
        user?: { employee_id?: string | null };
      }>("/auth/me");

      return response.data?.user?.employee_id ?? null;
    } catch {
      return null;
    }
  };

  const resetAbsenceForm = (): void => {
    setSelectedType("Emergency");
    setStartDate(null);
    setEndDate(null);
    setHandoverDetails("");
  };

  const doApplyLeave = async (): Promise<void> => {
    try {
      setSubmittingLeave(true);

      if (!startDate || !endDate) {
        setLeaveConfirmOpen(false);
        showToast("Please select the leave dates.");
        return;
      }

      const isoStart = toIsoDate(startDate);
      const isoEnd = toIsoDate(endDate);

      const employeeId = await resolveEmployeeId();

      if (!employeeId) {
        setLeaveConfirmOpen(false);
        showToast(
          "Could not determine your employee ID. Please log in again."
        );
        return;
      }

      employeeIdRef.current = employeeId;

      // Check for booked appointments inside the leave
      // range before actually applying.
      const conflicts =
        await findLeaveConflictingAppointments(
          employeeId,
          isoStart,
          isoEnd
        );

      setLeaveConfirmOpen(false);

      if (conflicts.length > 0) {
        setLeaveConflicts(conflicts);
        setLeaveConflictsOpen(true);
        return;
      }

      await applyLeaveNow(employeeId, false);
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to check appointments for this leave period."
      );
    } finally {
      setSubmittingLeave(false);
    }
  };

  const applyLeaveNow = async (
    employeeId: string,
    queueConflicts: boolean
  ): Promise<void> => {
    try {
      setSubmittingLeave(true);

      if (!startDate || !endDate) {
        setLeaveConflictsOpen(false);
        showToast("Please select the leave dates.");
        return;
      }

      const isoStart = toIsoDate(startDate);
      const isoEnd = toIsoDate(endDate);

      const handover = handoverDetails.trim();

      const leaveReason =
        (
          `${selectedType} absence.` +
          (handover ? ` Handover notes: ${handover}` : "")
        ).slice(0, 500);

      const payload: ApplyDoctorLeavePayload = {
        leave_start_date: isoStart,
        leave_end_date: isoEnd,
        leave_reason: leaveReason,
        leave_type: selectedType,
        requested_by: getUser()?.user_id ?? "",
      };

      const response = await doctorLeaveApi.apply(
        employeeId,
        payload
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Failed to apply leave."
        );
      }

      let queuedCount: number | undefined;
      let queueFailed = false;

      if (queueConflicts) {
        try {
          const queueResponse =
            await doctorLeaveApi.queueReschedule(
              employeeId,
              {
                date_from: isoStart,
                date_to: isoEnd,
                reason: `${selectedType} absence`,
              }
            );
          queuedCount = queueResponse.data?.data?.queued;
        } catch (queueError: any) {
          console.error(
            "Reschedule queueing failed:",
            queueError
          );
          queueFailed = true;
        }
      }

      setLeaveSuccessInfo({
        type: selectedType,
        from: format(startDate, "dd/MM/yyyy"),
        to: format(endDate, "dd/MM/yyyy"),
        leaveId: response.data?.leave?.leave_id,
        queuedCount,
        queueFailed,
      });

      setLeaveConflictsOpen(false);
      setLeaveSuccessOpen(true);

      resetAbsenceForm();
      loadAbsences();
    } catch (error: any) {
      setLeaveConfirmOpen(false);
      setLeaveConflictsOpen(false);

      showToast(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to apply for leave."
      );
    } finally {
      setSubmittingLeave(false);
    }
  };

  /*
   * =========================================================
   * CANCEL
   * =========================================================
   */

  const handleCancel = (): void => {
    setSelectedType("Emergency");
    setStartDate(null);
    setEndDate(null);
    setHandoverDetails("");

    showToast("Form cleared.");
  };

  /*
   * =========================================================
   * CHECKLIST
   * =========================================================
   */

  const toggleChecklist = (
    key: keyof ChecklistState
  ): void => {
    setChecklist((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  /*
   * =========================================================
   * DOWNLOAD CSV
   * =========================================================
   */

  const handleDownload = (): void => {
    if (absences.length === 0) {
      showToast("No absences logged yet.");
      return;
    }

    const archive: string[][] = [
      [
        "Leave ID",
        "Absence Type",
        "Duration",
        "Status",
        "Date Logged",
      ],
      ...absences.map(
        (
          absence: LoggedAbsenceRow
        ): string[] => [
          absence.leaveId,
          absence.type,
          absence.duration,
          absence.status,
          absence.dateLogged,
        ]
      ),
    ];

    const csv: string = archive
      .map((row: string[]) =>
        row
          .map(
            (value: string) =>
              `"${value.replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob: Blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url: string =
      URL.createObjectURL(blob);

    const link: HTMLAnchorElement =
      document.createElement("a");

    link.href = url;
    link.download = "absence-archive.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    showToast("Archive downloaded.");
  };

  /*
   * =========================================================
   * JSX
   * =========================================================
   */

  return (
    <div className="min-h-screen w-full overflow-x-auto bg-white font-['Inter',Arial,sans-serif] text-[#191c1d]">

      {/* =====================================================
          PAGE
      ====================================================== */}

      <div className="min-h-screen w-full p-0 sm:p-[10px]">

        <div className="mx-auto flex w-full max-w-[1008px] flex-col gap-[23px] px-3 sm:px-0">

          {/* =================================================
              HEADER
          ================================================= */}

          <header className="flex min-h-[64px] w-full items-center justify-between border-b border-[#c3c6d5] bg-white px-4 sm:px-6">

            {/* Breadcrumb */}

            <div className="flex items-center gap-2">

              <span className="whitespace-nowrap text-[12px] font-semibold leading-4 tracking-[0.6px] text-[#434653]">
                Dashboard
              </span>

              <img
                src="https://www.figma.com/api/mcp/asset/55e95392-3e6b-44bb-be26-ce3acca0a200.svg"
                alt=""
                className="h-[7px] w-[4px]"
              />

              <span className="whitespace-nowrap text-[12px] font-bold leading-4 tracking-[0.6px] text-[#00327d]">
                Absence Management
              </span>

            </div>


            {/* Header right */}

            <div className="flex items-center gap-4">

              <BellNotificationButton size="md" />


              <div className="h-8 w-px bg-[#c3c6d6]" />


              <div className="flex items-center gap-2 pl-2">

                <span className="hidden whitespace-nowrap font-['Manrope'] text-[12px] font-bold leading-4 tracking-[0.6px] text-[#434654] sm:block">
                  May 30, 2026
                </span>

                <img
                  src="https://www.figma.com/api/mcp/asset/da0f9f5f-0fae-47cd-97c1-242b9cecea30.svg"
                  alt=""
                  className="h-5 w-[18px]"
                />

              </div>

            </div>

          </header>


          {/* =================================================
              MAIN
          ================================================= */}

          <main className="grid w-full grid-cols-1 gap-6 lg:grid-cols-12">

            {/* =================================================
                LEFT
            ================================================= */}

            <section className="flex flex-col gap-6 lg:col-span-8">

              {/* =================================================
                  ABSENCE FORM CARD
              ================================================= */}

              <section className="rounded-[4px] border border-[#c3c6d5] bg-white px-5 py-6 shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:px-6">

                {/* Heading */}

                <div className="mb-6">

                  <h1 className="text-[24px] font-semibold leading-8 text-[#191c1d]">
                    Absence Management
                  </h1>

                  <p className="mt-1 w-full text-[14px] font-normal leading-6 text-[#434653] sm:text-[16px]">
                    Self-service log for planned or
                    emergency absences. Ensure clinical
                    handovers are scheduled.
                  </p>

                </div>


                {/* Form */}

                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-6"
                >

                  {/* =========================================
                      ABSENCE TYPE
                  ========================================== */}

                  <div className="flex flex-col gap-2">

                    <label className="text-[11px] font-medium uppercase leading-[14px] text-[#434653]">
                      SELECT ABSENCE TYPE
                    </label>


                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

                      {absenceTypes.map(
                        (
                          type: AbsenceTypeOption
                        ) => {

                          const isSelected =
                            selectedType ===
                            type.name;

                          return (
                            <button
                              key={type.name}
                              type="button"
                              onClick={() =>
                                setSelectedType(
                                  type.name
                                )
                              }
                              className={`
                                flex
                                h-[108px]
                                flex-col
                                items-center
                                justify-center
                                rounded-[4px]
                                transition
                                ${
                                  isSelected
                                    ? "border-2 border-[#00327d] bg-[#dbe3f1]"
                                    : "border border-[#c3c6d5] bg-white hover:border-[#00327d]"
                                }
                              `}
                            >

                              <div className="mb-2 flex h-8 items-center justify-center">

                                <img
                                  src={type.icon}
                                  alt=""
                                  className={type.className}
                                />

                              </div>


                              <span className="whitespace-nowrap text-[12px] font-semibold leading-4 tracking-[0.6px] text-[#191c1d]">
                                {type.name}
                              </span>

                            </button>
                          );
                        }
                      )}

                    </div>

                  </div>


                  {/* =========================================
                      DATE FIELDS
                  ========================================== */}

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

                    {/* Start */}

                    <div className="flex flex-col gap-1">

                      <label
                        htmlFor="startDate"
                        className="text-[11px] font-medium leading-[14px] text-[#434653]"
                      >
                        START DATE
                      </label>

                      <Popover
                        open={isStartCalendarOpen}
                        onOpenChange={
                          setIsStartCalendarOpen
                        }
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="
                              flex
                              h-[50px]
                              w-full
                              items-center
                              justify-between
                              rounded-[2px]
                              border
                              border-[#c3c6d5]
                              bg-white
                              px-[13px]
                              text-[16px]
                              leading-6
                              text-[#191c1d]
                              outline-none
                              transition
                              hover:border-[#00327d]
                              focus:border-[#00327d]
                              focus:ring-1
                              focus:ring-[#00327d]
                            "
                          >
                            <span
                              className={
                                startDate
                                  ? ""
                                  : "text-[#6b7280]"
                              }
                            >
                              {startDate
                                ? format(
                                    startDate,
                                    "dd/MM/yyyy"
                                  )
                                : "Select date"}
                            </span>

                            <CalendarDays className="size-[18px] shrink-0 text-[#434653]" />
                          </button>
                        </PopoverTrigger>

                        <PopoverContent
                          align="start"
                          className="w-auto border-[#c3c6d5] p-0 shadow-lg"
                        >
                          <CalendarPicker
                            selected={startDate}
                            hideThemePicker
                            minDate={startOfToday()}
                            onSelect={(date) => {
                              if (date instanceof Date) {
                                setStartDate(date);
                                setIsStartCalendarOpen(
                                  false
                                );
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>

                    </div>


                    {/* End */}

                    <div className="flex flex-col gap-1">

                      <label
                        htmlFor="endDate"
                        className="text-[11px] font-medium leading-[14px] text-[#434653]"
                      >
                        END DATE
                      </label>

                      <Popover
                        open={isEndCalendarOpen}
                        onOpenChange={setIsEndCalendarOpen}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="
                              flex
                              h-[50px]
                              w-full
                              items-center
                              justify-between
                              rounded-[2px]
                              border
                              border-[#c3c6d5]
                              bg-white
                              px-[13px]
                              text-[16px]
                              leading-6
                              text-[#191c1d]
                              outline-none
                              transition
                              hover:border-[#00327d]
                              focus:border-[#00327d]
                              focus:ring-1
                              focus:ring-[#00327d]
                            "
                          >
                            <span
                              className={
                                endDate
                                  ? ""
                                  : "text-[#6b7280]"
                              }
                            >
                              {endDate
                                ? format(
                                    endDate,
                                    "dd/MM/yyyy"
                                  )
                                : "Select date"}
                            </span>

                            <CalendarDays className="size-[18px] shrink-0 text-[#434653]" />
                          </button>
                        </PopoverTrigger>

                        <PopoverContent
                          align="start"
                          className="w-auto border-[#c3c6d5] p-0 shadow-lg"
                        >
                          <CalendarPicker
                            selected={endDate}
                            hideThemePicker
                            minDate={
                              startDate ?? startOfToday()
                            }
                            onSelect={(date) => {
                              if (date instanceof Date) {
                                setEndDate(date);
                                setIsEndCalendarOpen(
                                  false
                                );
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>

                    </div>

                  </div>


                  {/* =========================================
                      HANDOVER
                  ========================================== */}

                  <div className="flex flex-col gap-1">

                    <label
                      htmlFor="handover"
                      className="text-[11px] font-medium uppercase leading-[14px] text-[#434653]"
                    >
                      CLINICAL HANDOVER DETAILS
                    </label>

                    <textarea
                      id="handover"
                      value={handoverDetails}
                      onChange={(
                        event: React.ChangeEvent<HTMLTextAreaElement>
                      ) =>
                        setHandoverDetails(
                          event.target.value
                        )
                      }
                      placeholder="Enter patient handover status or covering physician name..."
                      className="
                        min-h-[96px]
                        w-full
                        resize-y
                        rounded-[2px]
                        border
                        border-[#c3c6d5]
                        bg-white
                        px-[13px]
                        py-[13px]
                        text-[16px]
                        leading-6
                        text-[#191c1d]
                        outline-none
                        placeholder:text-[#6b7280]
                        focus:border-[#00327d]
                        focus:ring-1
                        focus:ring-[#00327d]
                      "
                    />

                  </div>


                  {/* =========================================
                      ACTIONS
                  ========================================== */}

                  <div className="flex w-full flex-col-reverse justify-end gap-4 pt-4 sm:flex-row">

                    <button
                      type="button"
                      onClick={handleCancel}
                      className="
                        min-h-[42px]
                        rounded-[2px]
                        border
                        border-[#c3c6d5]
                        bg-white
                        px-[25px]
                        py-[9px]
                        text-[16px]
                        font-bold
                        leading-6
                        text-[#00327d]
                        transition
                        hover:bg-[#f6f8fb]
                        active:translate-y-px
                      "
                    >
                      Cancel
                    </button>


                    <button
                      type="submit"
                      className="
                        flex
                        min-h-[42px]
                        items-center
                        justify-center
                        gap-2
                        rounded-[2px]
                        border
                        border-[#00327d]
                        bg-[#00327d]
                        px-6
                        py-[9px]
                        text-[16px]
                        font-bold
                        leading-6
                        text-white
                        shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]
                        transition
                        hover:bg-[#00285f]
                        active:translate-y-px
                      "
                    >

                      <span>
                        Confirm Absence
                      </span>

                      <img
                        src="https://www.figma.com/api/mcp/asset/098c2568-c17a-42f9-9a7a-72030db32759.svg"
                        alt=""
                        className="h-[15px] w-[15px]"
                      />

                    </button>

                  </div>

                </form>

              </section>


              {/* =================================================
                  LOGGED ABSENCES
              ================================================== */}

              <section className="overflow-hidden rounded-[4px] border border-[#c3c6d5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">

                <div className="flex h-[61px] items-center justify-between border-b border-[#c3c6d5] px-6">

                  <h2 className="text-[18px] font-medium leading-6 text-[#191c1d]">
                    Logged Absences
                  </h2>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="text-[12px] font-bold leading-4 tracking-[0.6px] text-[#00327d] hover:underline"
                  >
                    Download Archive
                  </button>

                </div>


                {/* Table */}

                <div className="w-full overflow-x-auto">

                  <table className="w-full min-w-[650px] border-collapse">

                    <thead className="bg-[#edeeef]">

                      <tr>

                        <th className="h-10 px-6 py-3 text-left text-[12px] font-bold leading-4 tracking-[0.6px] text-[#434653]">
                          Absence Type
                        </th>

                        <th className="h-10 px-6 py-3 text-left text-[12px] font-bold leading-4 tracking-[0.6px] text-[#434653]">
                          Duration
                        </th>

                        <th className="h-10 px-6 py-3 text-left text-[12px] font-bold leading-4 tracking-[0.6px] text-[#434653]">
                          Date Logged
                        </th>

                        <th className="h-10 px-6 py-3 text-left text-[12px] font-bold leading-4 tracking-[0.6px] text-[#434653]">
                          Status
                        </th>

                        <th className="h-10 px-6 py-3 text-right text-[12px] font-bold leading-4 tracking-[0.6px] text-[#434653]">
                          Actions
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {absencesLoading ? (

                        <tr>

                          <td
                            colSpan={5}
                            className="h-28 px-6 py-4 text-center"
                          >

                            <Loader2 className="mx-auto size-5 animate-spin text-[#00327d]" />

                          </td>

                        </tr>

                      ) : absences.length === 0 ? (

                        <tr>

                          <td
                            colSpan={5}
                            className="h-28 px-6 py-4 text-center text-[14px] text-[#a0a7b1]"
                          >
                            No absences logged yet.
                          </td>

                        </tr>

                      ) : (
                        absences.map(
                          (
                            absence: LoggedAbsenceRow
                          ) => (
                            <tr
                              key={absence.leaveId}
                            >

                              <td className="h-14 border-b border-[#c3c6d5] px-6 py-4 text-[14px] leading-5 text-[#191c1d]">

                                <div className="flex items-center gap-2 whitespace-nowrap">

                                  <img
                                    src={absenceIconByType(absence.type)}
                                    alt=""
                                    className="h-[15px] w-[15px] object-contain"
                                  />

                                  <span>
                                    {absence.type}
                                  </span>

                                </div>

                              </td>


                              <td className="h-14 border-b border-[#c3c6d5] px-6 py-4 text-[14px] leading-5 text-[#191c1d]">

                                {absence.duration}

                              </td>


                              <td className="h-14 border-b border-[#c3c6d5] px-6 py-4 text-[14px] leading-5 text-[#434653]">

                                {absence.dateLogged}

                              </td>


                              <td className="h-14 border-b border-[#c3c6d5] px-6 py-4">

                                <span
                                  className={`inline-flex items-center rounded-full px-[10px] py-[4px] text-[11px] font-bold tracking-[0.4px] ${
                                    STATUS_BADGE_STYLES[
                                      absence.status
                                    ] ?? "bg-[#f7f8fa] text-[#434653]"
                                  }`}
                                >
                                  {absence.status}
                                </span>

                              </td>


                              <td className="h-14 border-b border-[#c3c6d5] px-6 py-4 text-right">

                                <button
                                  type="button"
                                  title="View absence"
                                  onClick={() =>
                                    showToast(
                                      `Viewing ${absence.type} absence · ${absence.duration} · Status: ${absence.status}`
                                    )
                                  }
                                  className="inline-flex items-center justify-center"
                                >

                                  <img
                                    src="https://www.figma.com/api/mcp/asset/eeb68661-6bbd-410f-9112-78c5df575306.svg"
                                    alt="View"
                                    className="h-[15px] w-[22px] object-contain transition hover:scale-105"
                                  />

                                </button>

                              </td>

                            </tr>
                          )
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </section>

            </section>


            {/* =================================================
                RIGHT COLUMN
            ================================================== */}

            <aside className="flex flex-col gap-6 lg:col-span-4">


              {/* =================================================
                  RETURN TO WORK CHECKLIST
              ================================================== */}

              <section className="rounded-[4px] border border-[#c3c6d5] border-l-4 border-l-[#00327d]/20 bg-white px-6 py-6 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">

                <div className="flex flex-col gap-4">

                  <div className="flex items-center gap-2">

                    <img
                      src="https://www.figma.com/api/mcp/asset/bae62b77-3cae-4adc-8201-ca5ab55f97d4.svg"
                      alt=""
                      className="h-[18px] w-5 object-contain"
                    />

                    <h2 className="whitespace-nowrap text-[18px] font-medium leading-6 text-[#191c1d]">
                      Return to Work Checklist
                    </h2>

                  </div>


                  <div className="flex flex-col gap-3">

                    {/* Handover */}

                    <label className="flex cursor-pointer items-start gap-3">

                      <input
                        type="checkbox"
                        checked={
                          checklist.handover
                        }
                        onChange={() =>
                          toggleChecklist(
                            "handover"
                          )
                        }
                        className="mt-[2px] h-4 w-4 shrink-0 cursor-pointer rounded-[2px] border-[#c3c6d5] accent-[#00327d]"
                      />

                      <span className="whitespace-nowrap text-[14px] font-normal leading-5 text-[#191c1d]">
                        Handover notes completed
                      </span>

                    </label>


                    {/* Followups */}

                    <label className="flex cursor-pointer items-start gap-3">

                      <input
                        type="checkbox"
                        checked={
                          checklist.followups
                        }
                        onChange={() =>
                          toggleChecklist(
                            "followups"
                          )
                        }
                        className="mt-[2px] h-4 w-4 shrink-0 cursor-pointer rounded-[2px] border-[#c3c6d5] accent-[#00327d]"
                      />

                      <span className="whitespace-nowrap text-[14px] font-normal leading-5 text-[#191c1d]">
                        Patient follow-ups scheduled
                      </span>

                    </label>


                    {/* EMR */}

                    <label className="flex cursor-pointer items-start gap-3">

                      <input
                        type="checkbox"
                        checked={checklist.emr}
                        onChange={() =>
                          toggleChecklist("emr")
                        }
                        className="mt-[2px] h-4 w-4 shrink-0 cursor-pointer rounded-[2px] border-[#c3c6d5] accent-[#00327d]"
                      />

                      <span className="whitespace-nowrap text-[14px] font-normal leading-5 text-[#191c1d]">
                        EMR updates finalized
                      </span>

                    </label>


                    {/* Cover */}

                    <label className="flex cursor-pointer items-start gap-3">

                      <input
                        type="checkbox"
                        checked={checklist.cover}
                        onChange={() =>
                          toggleChecklist("cover")
                        }
                        className="mt-[2px] h-4 w-4 shrink-0 cursor-pointer rounded-[2px] border-[#c3c6d5] accent-[#00327d]"
                      />

                      <span className="whitespace-nowrap text-[14px] font-normal leading-5 text-[#191c1d]">
                        Shift cover confirmed
                      </span>

                    </label>

                  </div>

                </div>

              </section>


              {/* =================================================
                  ANNUAL ENTITLEMENT
              ================================================== */}

              <section className="rounded-[4px] border border-[#c3c6d5] bg-white p-6 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">

                <h2 className="text-[12px] font-semibold leading-4 tracking-[1.2px] text-[#434653]">
                  ANNUAL ENTITLEMENT
                </h2>


                <div className="mt-6 flex flex-col gap-6">

                  {/* Vacation */}

                  <div className="flex flex-col gap-2">

                    <div className="flex items-end justify-between">

                      <span className="text-[16px] font-medium leading-6 text-[#191c1d]">
                        Vacation
                      </span>

                      <span className="text-[16px] font-bold leading-6 text-[#00327d]">
                        12 / 20 Days
                      </span>

                    </div>


                    <div className="h-2 w-full overflow-hidden rounded-xl bg-[#edeeef]">

                      <div className="h-full w-[60%] rounded-xl bg-[#00327d]" />

                    </div>

                  </div>


                  {/* Sick Leave */}

                  <div className="flex flex-col gap-2">

                    <div className="flex items-end justify-between">

                      <span className="text-[16px] font-medium leading-6 text-[#191c1d]">
                        Sick Leave
                      </span>

                      <span className="text-[16px] font-bold leading-6 text-[#434653]">
                        5 / 10 Days
                      </span>

                    </div>


                    <div className="h-2 w-full overflow-hidden rounded-xl bg-[#edeeef]">

                      <div className="h-full w-1/2 rounded-xl bg-[#575f6b]" />

                    </div>

                  </div>

                </div>

              </section>

            </aside>

          </main>

        </div>

      </div>


      {/* =====================================================
          LEAVE CONFIRM DIALOG
      ====================================================== */}

      <AlertDialog
        open={leaveConfirmOpen}
        onOpenChange={(open) => {
          if (!submittingLeave) setLeaveConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Do you want to proceed with the leave?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedType} absence from{" "}
              {startDate
                ? format(startDate, "dd/MM/yyyy")
                : "-"}{" "}
              to{" "}
              {endDate
                ? format(endDate, "dd/MM/yyyy")
                : "-"}
              . The request will be submitted for admin
              approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingLeave}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={submittingLeave}
              onClick={(event) => {
                event.preventDefault();
                doApplyLeave();
              }}
            >
              {submittingLeave ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Checking...
                </>
              ) : (
                "Proceed"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* =====================================================
          LEAVE SUCCESS DIALOG
      ====================================================== */}

      <AlertDialog open={leaveSuccessOpen} onOpenChange={setLeaveSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="size-5" />
              Leave applied successfully
            </AlertDialogTitle>
            <AlertDialogDescription>
              {leaveSuccessInfo && (
                <>
                  {leaveSuccessInfo.type} absence · Leave date:{" "}
                  {leaveSuccessInfo.from} to {leaveSuccessInfo.to}
                  {leaveSuccessInfo.leaveId
                    ? ` · Leave ID: ${leaveSuccessInfo.leaveId}`
                    : ""}
                  .
                  {typeof leaveSuccessInfo.queuedCount ===
                    "number" &&
                  leaveSuccessInfo.queuedCount > 0
                    ? ` ${leaveSuccessInfo.queuedCount} patient(s) sent to the reschedule queue.`
                    : ""}
                  {leaveSuccessInfo.queueFailed
                    ? " Could not add patients to the reschedule queue."
                    : ""}{" "}
                  Status: pending admin approval.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setLeaveSuccessOpen(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* =====================================================
          LEAVE CONFLICTS DIALOG
      ====================================================== */}

      <AlertDialog
        open={leaveConflictsOpen}
        onOpenChange={(open) => {
          if (!submittingLeave) setLeaveConflictsOpen(open);
        }}
      >
        <AlertDialogContent className="max-w-[460px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {leaveConflicts.length} appointment
              {leaveConflicts.length === 1 ? "" : "s"} scheduled during
              this leave
            </AlertDialogTitle>
            <AlertDialogDescription>
              You can send these patients to the reschedule queue so
              staff can assign them new slots, or apply the leave
              without changes.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-[220px] overflow-y-auto rounded-[4px] border border-[#c3c6d5]">
            {leaveConflicts.map(
              (conflict: LeaveConflict) => (
                <div
                  key={conflict.appointment_id}
                  className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] px-3 py-2 text-[12px] last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold leading-5 text-[#191c1d]">
                      {conflict.patientName}
                    </p>
                    <p className="leading-4 text-[#434653]">
                      {conflict.appointment_date
                        ? format(
                            new Date(conflict.appointment_date),
                            "dd/MM/yyyy"
                          )
                        : "-"}
                      {formatTimeOfDay(conflict.appointment_time)
                        ? ` · ${formatTimeOfDay(conflict.appointment_time)}`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#f1f2f4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#434653]">
                    {conflict.status}
                  </span>
                </div>
              )
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingLeave}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={submittingLeave}
              className="border border-[#c3c6d5] bg-white text-[#191c1d] hover:bg-[#f6f8fb]"
              onClick={(event) => {
                event.preventDefault();
                if (employeeIdRef.current) {
                  applyLeaveNow(employeeIdRef.current, false);
                }
              }}
            >
              Apply leave anyway
            </AlertDialogAction>
            <AlertDialogAction
              disabled={submittingLeave}
              onClick={(event) => {
                event.preventDefault();
                if (employeeIdRef.current) {
                  applyLeaveNow(employeeIdRef.current, true);
                }
              }}
            >
              Apply leave &amp; queue{" "}
              {leaveConflicts.length} patient
              {leaveConflicts.length === 1 ? "" : "s"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* =====================================================
          TOAST
      ====================================================== */}

      {toast && (
        <div
          className="
            fixed
            bottom-6
            right-6
            z-[1000]
            min-w-[280px]
            rounded-[4px]
            bg-[#00327d]
            px-[18px]
            py-[14px]
            text-[14px]
            leading-5
            text-white
            shadow-[0_8px_24px_rgba(0,0,0,0.2)]
          "
        >
          {toast}
        </div>
      )}

    </div>
  );
};

export default AbsenceManagement;