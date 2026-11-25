import React, { useState, useEffect, useMemo } from "react";
import { format, parseISO, addDays } from "date-fns";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  User,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Stethoscope,
  CalendarClock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import CalendarPicker from "@/components/hms/Calender";
import VoiceToText from "@/components/ui/voicetotext";
import {
  patientPortalApi,
  PatientAppointment,
  PortalBranch,
  PortalDoctor,
  PortalSlot,
} from "@/api/patientPortal.api";
import {
  formatTimeSlot,
  formatAppointmentDisplayDate,
} from "@/utils/formatters";
import { useToast } from "@/hooks/use-toast";

interface RescheduleAppointmentModalProps {
  isOpen: boolean;
  appointment: PatientAppointment | null;
  onClose: () => void;
  onSuccess: (updatedAppointment?: any) => void;
}

export const RescheduleAppointmentModal: React.FC<RescheduleAppointmentModalProps> = ({
  isOpen,
  appointment,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2>(1); // 1 = Pick date & slot, 2 = Success screen

  // Reschedule targets
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [reason, setReason] = useState<string>("Schedule conflict / unavailable on original date");

  // Optional: change doctor/branch
  const [showDoctorPicker, setShowDoctorPicker] = useState<boolean>(false);
  const [branches, setBranches] = useState<PortalBranch[]>([]);
  const [doctors, setDoctors] = useState<PortalDoctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState<boolean>(false);

  // Slots state
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [slotsData, setSlotsData] = useState<PortalSlot[]>([]);
  const [isOnLeave, setIsOnLeave] = useState<boolean>(false);
  const [leaveReason, setLeaveReason] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [rescheduledResult, setRescheduledResult] = useState<any>(null);

  // Initialize from appointment when modal opens
  useEffect(() => {
    if (!isOpen || !appointment) {
      setStep(1);
      setShowDoctorPicker(false);
      setRescheduledResult(null);
      setSelectedSlot("");
      setSlotsData([]);
      return;
    }

    // Attempt to resolve existing doctor ID and branch ID
    const initialBranch =
      appointment.branch_id ||
      appointment.branch?.branch_id ||
      "";
    const initialDoctor =
      appointment.employee_id ||
      "";

    setSelectedBranchId(initialBranch);
    setSelectedDoctorId(initialDoctor);

    // Initial date: tomorrow or original appointment date if future
    const originalDate = appointment.appointment_date?.split("T")[0] || "";
    const today = format(new Date(), "yyyy-MM-dd");
    const initDate =
      originalDate && originalDate > today
        ? originalDate
        : format(addDays(new Date(), 1), "yyyy-MM-dd");
    setSelectedDate(initDate);
    setSelectedSlot("");
    setReason("Schedule conflict / unavailable on original date");
  }, [isOpen, appointment]);

  // Load branches & doctors if doctor picker is opened or to resolve doctor info
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    patientPortalApi
      .getBranches()
      .then((bList) => {
        if (!active) return;
        setBranches(bList || []);
        if (!selectedBranchId && bList && bList.length > 0) {
          setSelectedBranchId(bList[0].branch_id);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isOpen, selectedBranchId]);

  // Fetch doctors for the selected branch
  useEffect(() => {
    if (!isOpen || !selectedBranchId) return;

    let active = true;
    setLoadingDoctors(true);

    patientPortalApi
      .getDoctors({ branchId: selectedBranchId })
      .then((docs) => {
        if (!active) return;
        setDoctors(docs || []);

        // If no doctor selected yet, or if current doctor not found, default to first or matched doctor
        if (
          !selectedDoctorId ||
          !docs.some((d) => d.employee_id === selectedDoctorId)
        ) {
          const matchByName = docs.find((d) =>
            appointment?.doctor_name
              ? d.full_name
                  .toLowerCase()
                  .includes(appointment.doctor_name.toLowerCase()) ||
                appointment.doctor_name
                  .toLowerCase()
                  .includes(d.first_name.toLowerCase())
              : false
          );
          if (matchByName) {
            setSelectedDoctorId(matchByName.employee_id);
          } else if (docs.length > 0) {
            setSelectedDoctorId(docs[0].employee_id);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingDoctors(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, selectedBranchId, appointment]);

  // When doctor, branch, or date changes, load available slots
  useEffect(() => {
    if (!isOpen || !selectedDoctorId || !selectedBranchId || !selectedDate) {
      setSlotsData([]);
      return;
    }

    let active = true;
    setSlotsLoading(true);
    setIsOnLeave(false);
    setLeaveReason(null);
    setSelectedSlot("");

    patientPortalApi
      .getAvailableSlots({
        employeeId: selectedDoctorId,
        branchId: selectedBranchId,
        date: selectedDate,
      })
      .then((res) => {
        if (!active) return;
        if (res.is_on_leave) {
          setIsOnLeave(true);
          setLeaveReason(res.leave_reason || "Doctor is on approved leave");
          setSlotsData([]);
        } else {
          setIsOnLeave(false);
          setLeaveReason(null);
          setSlotsData(res.slots || []);
        }
      })
      .catch((err) => {
        console.error("Error loading slots:", err);
        if (active) setSlotsData([]);
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, selectedDoctorId, selectedBranchId, selectedDate]);

  // Group slots into Morning, Afternoon, Evening
  const slotGroups = useMemo(() => {
    const morning: PortalSlot[] = [];
    const afternoon: PortalSlot[] = [];
    const evening: PortalSlot[] = [];

    slotsData.forEach((slot) => {
      const timeParts = slot.time.split(":");
      const hour = parseInt(timeParts[0], 10);
      if (hour < 12) {
        morning.push(slot);
      } else if (hour < 17) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    return { morning, afternoon, evening };
  }, [slotsData]);

  // Format time slot
  const formatSlot = (timeStr: string) => formatTimeSlot(timeStr);

  const formatDate = (dateStr: string) =>
    formatAppointmentDisplayDate(dateStr, false);

  const handleReschedule = async () => {
    if (!appointment || !selectedDate || !selectedSlot) {
      toast({
        title: "Missing Information",
        description: "Please select a date and an available time slot.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await patientPortalApi.rescheduleAppointment(
        appointment.appointment_id,
        {
          employee_id: selectedDoctorId || undefined,
          branch_id: selectedBranchId || undefined,
          appointment_date: selectedDate,
          appointment_time: selectedSlot,
          reason_for_visit:
            reason.trim() || appointment.reason_for_visit || "Rescheduled Consultation",
        }
      );

      setRescheduledResult(res);
      setStep(2); // Success screen
      toast({
        title: "Appointment Rescheduled Successfully!",
        description: `Your consultation has been moved to ${format(
          parseISO(selectedDate),
          "dd MMM yyyy"
        )} at ${formatSlot(selectedSlot)}.`,
      });
      onSuccess(res);
    } catch (err: any) {
      toast({
        title: "Reschedule Failed",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Could not reschedule appointment. Please try another time slot.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !appointment) return null;

  const currentDoctor = doctors.find((d) => d.employee_id === selectedDoctorId);
  const currentBranch = branches.find((b) => b.branch_id === selectedBranchId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/60 via-white to-blue-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00488D] text-white flex items-center justify-center shadow-xs">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Reschedule Consultation
              </h2>
              <p className="text-xs text-slate-500">
                Choose a new date and convenient time slot for your appointment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 1 ? (
            <div className="space-y-6">
              {/* Current Appointment Banner */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Currently Booked Appointment
                  </span>
                  {appointment.token_number && (
                    <span className="font-bold text-[#00488D] bg-blue-100/70 px-2 py-0.5 rounded text-[11px]">
                      Token #{appointment.token_number}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-[#00488D] font-bold flex items-center justify-center shrink-0">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-800 text-sm truncate">
                      {appointment.doctor_name}
                    </h4>
                    <p className="text-slate-500 text-[11px] truncate">
                      {appointment.department || "Clinical OPD"} •{" "}
                      {appointment.branch?.branch_name || "Hospital Clinic"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-medium">
                      {formatDate(appointment.appointment_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-medium">
                      {formatSlot(appointment.appointment_time)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional: Change Doctor/Branch Toggle */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  Select New Date & Time Slot
                </span>
                <button
                  type="button"
                  onClick={() => setShowDoctorPicker(!showDoctorPicker)}
                  className="text-xs font-semibold text-[#00488D] hover:underline"
                >
                  {showDoctorPicker
                    ? "Keep current doctor"
                    : "Need to change doctor or branch?"}
                </button>
              </div>

              {/* Expandable Doctor & Branch Selector */}
              {showDoctorPicker && (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Branch
                      </label>
                      <select
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                      >
                        {branches.map((b) => (
                          <option key={b.branch_id} value={b.branch_id}>
                            {b.branch_name} {b.branch_area ? `(${b.branch_area})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Doctor
                      </label>
                      <select
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                      >
                        {doctors.map((d) => (
                          <option key={d.employee_id} value={d.employee_id}>
                            {d.full_name} ({d.specialization})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Date & Slots Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Calendar Date Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <CalendarIcon className="h-4 w-4 text-[#00488D]" />
                    <span>Select New Appointment Date</span>
                  </label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden p-2 bg-white shadow-xs">
                    <CalendarPicker
                      theme="light"
                      hideThemePicker
                      selected={parseISO(selectedDate)}
                      minDate={new Date()}
                      maxDate={addDays(new Date(), 60)}
                      onSelect={(date) => {
                        if (date instanceof Date) {
                          setSelectedDate(format(date, "yyyy-MM-dd"));
                          setSelectedSlot("");
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Available Slots */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-[#00488D]" />
                      <span>
                        Available Slots for{" "}
                        {format(parseISO(selectedDate), "EEE, dd MMM yyyy")}
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Pick a suitable time slot for your new visit date.
                    </p>
                  </div>

                  {slotsLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin text-[#00488D]" />
                      <p className="text-xs">Checking doctor schedules...</p>
                    </div>
                  ) : isOnLeave ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span>Doctor is on leave on this date</span>
                      </div>
                      <p className="text-[11px] text-amber-700">
                        {leaveReason || "Please pick another date from the calendar."}
                      </p>
                    </div>
                  ) : slotsData.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                      <Clock className="h-6 w-6 mx-auto mb-1 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">
                        No active consultation shifts on this day
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Please choose a different date from the calendar.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                      {/* Morning slots */}
                      {slotGroups.morning.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                            Morning Slots
                          </span>
                          <div className="grid grid-cols-3 gap-2 mt-1.5">
                            {slotGroups.morning.map((s) => {
                              const isSelected = selectedSlot === s.time;
                              const available = s.is_available;
                              return (
                                <button
                                  key={s.time}
                                  type="button"
                                  disabled={!available}
                                  onClick={() => setSelectedSlot(s.time)}
                                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                                    isSelected
                                      ? "bg-[#00488D] text-white border-[#00488D] shadow-xs"
                                      : available
                                      ? "bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40"
                                      : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50"
                                  }`}
                                >
                                  {formatSlot(s.time)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Afternoon slots */}
                      {slotGroups.afternoon.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                            Afternoon Slots
                          </span>
                          <div className="grid grid-cols-3 gap-2 mt-1.5">
                            {slotGroups.afternoon.map((s) => {
                              const isSelected = selectedSlot === s.time;
                              const available = s.is_available;
                              return (
                                <button
                                  key={s.time}
                                  type="button"
                                  disabled={!available}
                                  onClick={() => setSelectedSlot(s.time)}
                                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                                    isSelected
                                      ? "bg-[#00488D] text-white border-[#00488D] shadow-xs"
                                      : available
                                      ? "bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40"
                                      : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50"
                                  }`}
                                >
                                  {formatSlot(s.time)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Evening slots */}
                      {slotGroups.evening.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                            Evening Slots
                          </span>
                          <div className="grid grid-cols-3 gap-2 mt-1.5">
                            {slotGroups.evening.map((s) => {
                              const isSelected = selectedSlot === s.time;
                              const available = s.is_available;
                              return (
                                <button
                                  key={s.time}
                                  type="button"
                                  disabled={!available}
                                  onClick={() => setSelectedSlot(s.time)}
                                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                                    isSelected
                                      ? "bg-[#00488D] text-white border-[#00488D] shadow-xs"
                                      : available
                                      ? "bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40"
                                      : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50"
                                  }`}
                                >
                                  {formatSlot(s.time)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Reason for Reschedule */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reason for Rescheduling
                </label>
                <VoiceToText
                  value={reason}
                  onChange={setReason}
                  placeholder="Reason for changing consultation date..."
                  rows={2}
                />
              </div>

              {/* Before and After Comparison Preview */}
              {selectedSlot && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      ORIGINAL BOOKING
                    </span>
                    <span className="line-through text-slate-400">
                      {formatDate(appointment.appointment_date)},{" "}
                      {formatSlot(appointment.appointment_time)}
                    </span>
                  </div>

                  <ArrowRight className="h-4 w-4 text-emerald-600 shrink-0" />

                  <div className="text-right">
                    <span className="text-[10px] text-emerald-700 font-bold block">
                      NEW RESCHEDULED SLOT
                    </span>
                    <span className="font-bold text-emerald-800">
                      {formatDate(selectedDate)}, {formatSlot(selectedSlot)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: Success Confirmation Screen */
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Appointment Rescheduled!
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Your appointment slot and queue token have been successfully updated in the hospital system.
                </p>
              </div>

              <div className="inline-block bg-blue-50 border border-blue-100 rounded-2xl p-4 my-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  New OPD Queue Token Number
                </span>
                <span className="text-3xl font-extrabold text-[#00488D] tracking-tight">
                  #
                  {rescheduledResult?.token_number ||
                    rescheduledResult?.appointment_history?.token_number ||
                    1}
                </span>
              </div>

              <div className="max-w-md mx-auto bg-slate-50 rounded-xl p-4 border border-slate-200 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Doctor:</span>
                  <span className="font-bold text-slate-800">
                    {currentDoctor?.full_name || appointment.doctor_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">New Date:</span>
                  <span className="font-semibold text-slate-800">
                    {format(parseISO(selectedDate), "EEEE, dd MMMM yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">New Time Slot:</span>
                  <span className="font-semibold text-slate-800">
                    {formatSlot(selectedSlot)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Branch:</span>
                  <span className="font-semibold text-slate-800">
                    {currentBranch?.branch_name || appointment.branch?.branch_name || "Hospital OPD"}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Please arrive 10 minutes prior to your new scheduled consultation time.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Keep Current Booking
              </button>

              <button
                type="button"
                disabled={!selectedSlot || submitting}
                onClick={handleReschedule}
                className="flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-bold bg-[#00488D] text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Rescheduling...</span>
                  </>
                ) : (
                  <>
                    <CalendarClock className="h-4 w-4" />
                    <span>Confirm Reschedule</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl text-xs font-bold bg-[#00488D] text-white hover:bg-blue-800 transition-all shadow-xs"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
