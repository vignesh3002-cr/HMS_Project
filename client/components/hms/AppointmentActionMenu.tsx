import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { usePermission } from "@/context/PermissionContext";
import VitalsSignsPopover from "./VitalsSignsPopover";

interface AppointmentActionMenuProps {
  status: string;
  onView: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  vitalsOpen: boolean;
  onVitalsOpenChange: (open: boolean) => void;
  appointmentId?: string;
  patientId?: string;
}

export function AppointmentActionMenu({
  status,
  onView,
  onEdit,
  onCancel,
  onCheckIn,
  onCheckOut,
  vitalsOpen,
  onVitalsOpenChange,
  appointmentId,
  patientId,
}: AppointmentActionMenuProps) {
  const { can } = usePermission();

  if (!can("appointment.read") && !can("appointment.update") && !can("appointment.cancel")) {
    return null;
  }

  const normalizedStatus = status.toLowerCase().replace(/_/g, " ").trim();
  const isCancelled = normalizedStatus === "cancelled";
  const isScheduled = normalizedStatus === "scheduled";
  const isCheckIn =
    normalizedStatus === "checked in" ||
    normalizedStatus === "check in" ||
    normalizedStatus === "in consultation";
  const isInConsultation = normalizedStatus === "in consultation";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-center p-1.5 border border-[#E5E7EB] rounded-md hover:border-[#00488D] transition-colors outline-none"
          >
            <MoreVertical className="w-4 h-4 text-[#6B7280]" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={4}
          className="w-44 rounded-md border-[#E5E7EB] bg-white p-0 shadow-lg"
        >
          {can("appointment.read") && (
            <DropdownMenuItem
              onSelect={() => onView()}
              className="flex w-full cursor-pointer px-3 py-2 text-xs font-semibold text-left text-[#374151] focus:bg-[#F2F4F6]"
            >
              View Appointment
            </DropdownMenuItem>
          )}
          {can("appointment.update") && !isCancelled && (
            <DropdownMenuItem
              onSelect={() => onEdit()}
              className="flex w-full cursor-pointer px-3 py-2 text-xs font-semibold text-left text-[#374151] focus:bg-[#F2F4F6]"
            >
              Edit Appointment
            </DropdownMenuItem>
          )}
          {can("appointment.update") && isScheduled && (
            <DropdownMenuItem
              onSelect={() => onCheckIn()}
              className="flex w-full cursor-pointer px-3 py-2 text-xs font-semibold text-left text-green-600 focus:bg-green-50"
            >
              Check In
            </DropdownMenuItem>
          )}
          {can("appointment.update") && isCheckIn && (
            <DropdownMenuItem
              onSelect={() => onCheckOut()}
              className="flex w-full cursor-pointer px-3 py-2 text-xs font-semibold text-left text-blue-600 focus:bg-blue-50"
            >
              Check Out
            </DropdownMenuItem>
          )}
          {can("appointment.read") && isInConsultation && (
            <DropdownMenuItem
              onSelect={() => onVitalsOpenChange(true)}
              className="flex w-full cursor-pointer px-3 py-2 text-xs font-semibold text-left text-purple-600 focus:bg-purple-50"
            >
              Vitals
            </DropdownMenuItem>
          )}
          {can("appointment.cancel") && !isCancelled && (
            <DropdownMenuItem
              onSelect={() => onCancel()}
              className="flex w-full cursor-pointer px-3 py-2 text-xs font-semibold text-left text-red-600 focus:bg-red-50"
            >
              Cancel Appointment
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <VitalsSignsPopover
        open={vitalsOpen}
        onOpenChange={onVitalsOpenChange}
        appointmentId={appointmentId}
        patientId={patientId}
      />
    </>
  );
}