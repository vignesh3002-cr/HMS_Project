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
  Building2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import CalendarPicker from "@/components/hms/Calender";
import VoiceToText from "@/components/ui/voicetotext";
import {
  patientPortalApi,
  PortalBranch,
  PortalDepartment,
  PortalDoctor,
  PortalSlot,
} from "@/api/patientPortal.api";
import {
  formatTimeSlot,
  formatAppointmentDisplayDate,
} from "@/utils/formatters";
import { useToast } from "@/hooks/use-toast";

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAppointment?: any) => void;
}

export const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();

  // Wizard step: 1 = Doctor/Specialty, 2 = Date & Slot, 3 = Reason & Confirm, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [branches, setBranches] = useState<PortalBranch[]>([]);
  const [departments, setDepartments] = useState<PortalDepartment[]>([]);
  const [doctors, setDoctors] = useState<PortalDoctor[]>([]);

  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<PortalDoctor | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsData, setSlotsData] = useState<PortalSlot[]>([]);
  const [isOnLeave, setIsOnLeave] = useState(false);
  const [leaveReason, setLeaveReason] = useState<string | null>(null);

  const [visitType, setVisitType] = useState<string>("Consultation");
  const [reasonForVisit, setReasonForVisit] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [bookedResult, setBookedResult] = useState<any>(null);

  // Load branches & departments when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setStep(1);
      setSelectedBranchId("");
      setSelectedDepartmentId("");
      setSelectedDoctor(null);
      setSelectedDate(format(new Date(), "yyyy-MM-dd"));
      setSelectedSlot("");
      setSlotsData([]);
      setBookedResult(null);
      setReasonForVisit("");
      return;
    }

    let active = true;
    setLoadingInitial(true);

    Promise.all([
      patientPortalApi.getBranches(),
      patientPortalApi.getDepartments(),
    ])
      .then(([bList, dList]) => {
        if (!active) return;
        setBranches(bList || []);
        setDepartments(dList || []);
        if (bList && bList.length > 0) {
          setSelectedBranchId(bList[0].branch_id);
        }
      })
      .catch((err) => {
        console.error("Error loading branches or departments:", err);
      })
      .finally(() => {
        if (active) setLoadingInitial(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  // When branch changes, reload departments for this branch
  useEffect(() => {
    if (!selectedBranchId) return;
    let active = true;
    patientPortalApi
      .getDepartments(selectedBranchId)
      .then((dList) => {
        if (active) {
          setDepartments(dList || []);
          if (
            selectedDepartmentId &&
            !dList.some((d) => d.department_id === selectedDepartmentId)
          ) {
            setSelectedDepartmentId("");
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedBranchId]);

  // When branch or department changes, fetch doctors
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoadingDoctors(true);

    patientPortalApi
      .getDoctors({
        branchId: selectedBranchId || undefined,
        departmentId: selectedDepartmentId || undefined,
      })
      .then((docs) => {
        if (!active) return;
        setDoctors(docs || []);
        if (
          selectedDoctor &&
          !docs.some((d) => d.employee_id === selectedDoctor.employee_id)
        ) {
          setSelectedDoctor(null);
        }
      })
      .catch((err) => {
        console.error("Error loading doctors:", err);
      })
      .finally(() => {
        if (active) setLoadingDoctors(false);
      });

    return () => {
      active = false;
    };
  }, [selectedBranchId, selectedDepartmentId, isOpen]);

  // When doctor, branch, or date changes, load available slots
  useEffect(() => {
    if (!selectedDoctor || !selectedBranchId || !selectedDate) {
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
        employeeId: selectedDoctor.employee_id,
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
  }, [selectedDoctor, selectedBranchId, selectedDate]);

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

  // Format time slot (handles ISO date strings and HH:mm)
  const formatSlot = (timeStr: string) => formatTimeSlot(timeStr);

  const handleBook = async () => {
    if (
      !selectedDoctor ||
      !selectedBranchId ||
      !selectedDate ||
      !selectedSlot
    ) {
      toast({
        title: "Required information missing",
        description: "Please select doctor, date, and a valid time slot.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await patientPortalApi.bookAppointment({
        branch_id: selectedBranchId,
        department_id:
          selectedDoctor.department_id ||
          selectedDepartmentId ||
          departments[0]?.department_id ||
          "",
        employee_id: selectedDoctor.employee_id,
        appointment_date: selectedDate,
        appointment_time: selectedSlot,
        reason_for_visit: reasonForVisit.trim() || "OPD Consultation",
        patient_visit_type: visitType,
        duration_minutes: 15,
      });

      setBookedResult(res);
      setStep(4); // Success screen
      toast({
        title: "Appointment Booked Successfully!",
        description: `Your token #${
          res?.appointment_history?.token_number ||
          res?.token_number ||
          res?.appointment?.token_number ||
          "1"
        } has been reserved.`,
      });
      onSuccess(res);
    } catch (err: any) {
      toast({
        title: "Booking Failed",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Could not complete booking. Please try another slot.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentBranch = branches.find((b) => b.branch_id === selectedBranchId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-blue-50/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00488D] text-white flex items-center justify-center shadow-xs">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Book Outpatient (OPD) Appointment
              </h2>
              <p className="text-xs text-slate-500">
                Choose doctor, pick a date & time slot, and receive instant token
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

        {/* Progress Stepper (hidden on success step) */}
        {step < 4 && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
            <div
              className={`flex items-center gap-2 font-semibold ${
                step >= 1 ? "text-[#00488D]" : "text-slate-400"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step >= 1
                    ? "bg-[#00488D] text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                1
              </span>
              <span>Select Specialist</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-200 hidden sm:block" />

            <div
              className={`flex items-center gap-2 font-semibold ${
                step >= 2 ? "text-[#00488D]" : "text-slate-400"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step >= 2
                    ? "bg-[#00488D] text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                2
              </span>
              <span>Date & Time Slot</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-200 hidden sm:block" />

            <div
              className={`flex items-center gap-2 font-semibold ${
                step >= 3 ? "text-[#00488D]" : "text-slate-400"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step >= 3
                    ? "bg-[#00488D] text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                3
              </span>
              <span>Review & Confirm</span>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: Branch, Department, Doctor Selection */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Branch and Department Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-[#00488D]" />
                    <span>Hospital Branch</span>
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => {
                      setSelectedBranchId(e.target.value);
                      setSelectedDoctor(null);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {branches.map((b) => (
                      <option key={b.branch_id} value={b.branch_id}>
                        {b.branch_name}{" "}
                        {b.branch_area ? `(${b.branch_area})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5 text-[#00488D]" />
                    <span>Specialty / Department</span>
                  </label>
                  <select
                    value={selectedDepartmentId}
                    onChange={(e) => {
                      setSelectedDepartmentId(e.target.value);
                      setSelectedDoctor(null);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Clinical Specialties</option>
                    {departments.map((d) => (
                      <option key={d.department_id} value={d.department_id}>
                        {d.department_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Doctors List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Choose Consulting Doctor
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {doctors.length} doctor{doctors.length !== 1 ? "s" : ""}{" "}
                    available
                  </span>
                </div>

                {loadingDoctors ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-[#00488D]" />
                    <p className="text-xs">Finding available specialists...</p>
                  </div>
                ) : doctors.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <User className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">
                      No doctors currently found for this specialty/branch
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Try selecting "All Specialties" or a different hospital branch.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                    {doctors.map((doc) => {
                      const isSelected =
                        selectedDoctor?.employee_id === doc.employee_id;
                      const initials =
                        `${doc.first_name?.[0] || ""}${
                          doc.last_name?.[0] || ""
                        }`.toUpperCase() || "DR";

                      return (
                        <div
                          key={doc.employee_id}
                          onClick={() => setSelectedDoctor(doc)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                            isSelected
                              ? "border-[#00488D] bg-blue-50/70 ring-1 ring-[#00488D] shadow-xs"
                              : "border-slate-200 hover:border-blue-300 hover:bg-slate-50/60"
                          }`}
                        >
                          {doc.photo_url ? (
                            <img
                              src={doc.photo_url}
                              alt={doc.full_name}
                              className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-blue-100 text-[#00488D] font-bold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-800 truncate">
                              {doc.full_name}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate">
                              {doc.specialization ||
                                doc.department_name ||
                                "General Physician"}
                            </p>
                            {doc.qualification && (
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {doc.qualification}
                              </p>
                            )}
                          </div>

                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-[#00488D] shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Date & Slot Selection */}
          {step === 2 && selectedDoctor && (
            <div className="space-y-6">
              {/* Doctor summary banner */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#00488D] text-white flex items-center justify-center font-bold text-xs">
                    Dr
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      {selectedDoctor.full_name}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {selectedDoctor.specialization || "Physician"} •{" "}
                      {currentBranch?.branch_name || "Hospital OPD"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-[#00488D] hover:underline"
                >
                  Change
                </button>
              </div>

              {/* Date & Slots Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Calendar Date Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <CalendarIcon className="h-4 w-4 text-[#00488D]" />
                    <span>Select Appointment Date</span>
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
                      Click a time slot to select. Greyed out slots are fully booked.
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
                        {leaveReason || "Please choose another date."}
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
            </div>
          )}

          {/* STEP 3: Reason & Confirmation */}
          {step === 3 && selectedDoctor && (
            <div className="space-y-5">
              {/* Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#00488D]" />
                  <span>Consultation Summary</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[#00488D] shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        DOCTOR
                      </span>
                      <strong className="text-slate-800">
                        {selectedDoctor.full_name}
                      </strong>{" "}
                      <span className="text-slate-500">
                        ({selectedDoctor.specialization})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#00488D] shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        HOSPITAL BRANCH
                      </span>
                      <strong className="text-slate-800">
                        {currentBranch?.branch_name || "Hospital OPD"}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-[#00488D] shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        DATE
                      </span>
                      <strong className="text-slate-800">
                        {format(parseISO(selectedDate), "EEEE, dd MMMM yyyy")}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#00488D] shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        TIME SLOT
                      </span>
                      <strong className="text-[#00488D] font-bold">
                        {formatSlot(selectedSlot)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visit Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Visit Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Consultation", "Follow-up", "Routine Checkup"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setVisitType(type)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                        visitType === type
                          ? "bg-blue-50 text-[#00488D] border-[#00488D] ring-1 ring-[#00488D]"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason for Visit with Voice to Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reason for Consultation / Symptoms (Optional)
                </label>
                <VoiceToText
                  value={reasonForVisit}
                  onChange={setReasonForVisit}
                  placeholder="Describe your symptoms, main complaints, or reason for booking..."
                  rows={3}
                />
              </div>

              {/* Information Note */}
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#00488D] shrink-0 mt-0.5" />
                <span>
                  A unique OPD Queue Token Number will be allocated upon booking.
                  Please arrive 10 minutes prior to your allocated time slot.
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: Success Screen */}
          {step === 4 && bookedResult && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Appointment Confirmed!
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Your appointment has been registered with the hospital system.
                </p>
              </div>

              <div className="inline-block bg-blue-50 border border-blue-100 rounded-2xl p-4 my-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  OPD Queue Token Number
                </span>
                <span className="text-3xl font-extrabold text-[#00488D] tracking-tight">
                  #
                  {bookedResult?.appointment_history?.token_number ||
                    bookedResult?.token_number ||
                    bookedResult?.appointment?.token_number ||
                    1}
                </span>
              </div>

              <div className="max-w-md mx-auto bg-slate-50 rounded-xl p-4 border border-slate-200 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Doctor:</span>
                  <span className="font-bold text-slate-800">
                    {selectedDoctor?.full_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-semibold text-slate-800">
                    {format(parseISO(selectedDate), "dd MMM yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time Slot:</span>
                  <span className="font-semibold text-slate-800">
                    {formatSlot(selectedSlot)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-semibold text-slate-800">
                    {currentBranch?.branch_name}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                You can view or cancel this appointment at any time from your
                Appointments tab.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedDoctor}
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#00488D] text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
              >
                <span>Continue to Select Date</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={!selectedSlot}
                onClick={() => setStep(3)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#00488D] text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
              >
                <span>Review & Confirm</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleBook}
                className="flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Booking Appointment...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & Book Appointment</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === 4 && (
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
