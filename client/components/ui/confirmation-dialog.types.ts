import type { ReactNode } from "react";

export type ConfirmationDialogType =
  | "warning"
  | "danger"
  | "info"
  | "success"
  | "question"
  | "lock";

export interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  type?: ConfirmationDialogType;
  confirmText?: string;
  cancelText?: string;
  hideCancelButton?: boolean;
  loading?: boolean;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ConfirmationDialogTypeConfig {
  icon: ReactNode;
  iconContainerClass: string;
  confirmButtonClass: string;
}