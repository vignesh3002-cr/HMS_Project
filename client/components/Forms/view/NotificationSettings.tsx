import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";

const SETTINGS_KEY = "hms_notification_settings";

type NotificationSettings = {
  patientCreated: boolean;
  patientUpdated: boolean;
  employeeCreated: boolean;
  employeeUpdated: boolean;
  employeeDeleted: boolean;
  appointmentCreated: boolean;
  appointmentUpdated: boolean;
  appointmentCancelled: boolean;
  channelInApp: boolean;
  channelEmail: boolean;
  channelSms: boolean;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  patientCreated: true,
  patientUpdated: true,
  employeeCreated: true,
  employeeUpdated: true,
  employeeDeleted: true,
  appointmentCreated: true,
  appointmentUpdated: true,
  appointmentCancelled: true,
  channelInApp: true,
  channelEmail: false,
  channelSms: false,
};

function loadSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

const TYPE_GROUPS: {
  title: string;
  description: string;
  items: {
    key: keyof NotificationSettings;
    label: string;
    description: string;
  }[];
}[] = [
  {
    title: "Patients",
    description: "Alerts about patient activity.",
    items: [
      {
        key: "patientCreated",
        label: "Patient created",
        description:
          "Notify me when a new patient is registered.",
      },
      {
        key: "patientUpdated",
        label: "Patient updated",
        description:
          "Notify me when a patient's details are updated.",
      },
    ],
  },
  {
    title: "Employees",
    description:
      "Alerts about staff, doctor and admin accounts.",
    items: [
      {
        key: "employeeCreated",
        label: "Employee created",
        description:
          "Notify me when a new employee is added.",
      },
      {
        key: "employeeUpdated",
        label: "Employee updated",
        description:
          "Notify me when an employee's details are updated.",
      },
      {
        key: "employeeDeleted",
        label: "Employee deleted",
        description:
          "Notify me when an employee is removed.",
      },
    ],
  },
  {
    title: "Appointments",
    description: "Alerts about appointment activity.",
    items: [
      {
        key: "appointmentCreated",
        label: "Appointment created",
        description:
          "Notify me when a new appointment is booked.",
      },
      {
        key: "appointmentUpdated",
        label: "Appointment updated",
        description:
          "Notify me when an appointment is rescheduled or changed.",
      },
      {
        key: "appointmentCancelled",
        label: "Appointment cancelled",
        description:
          "Notify me when an appointment is cancelled.",
      },
    ],
  },
];

const CHANNELS: {
  key: keyof NotificationSettings;
  label: string;
  description: string;
}[] = [
  {
    key: "channelInApp",
    label: "In-app notifications",
    description:
      "Show notifications inside the application.",
  },
  {
    key: "channelEmail",
    label: "Email notifications",
    description: "Send notifications to your email address.",
  },
  {
    key: "channelSms",
    label: "SMS notifications",
    description: "Send notifications to your mobile number.",
  },
];

export default function NotificationSettings() {
  const [settings, setSettings] =
    useState<NotificationSettings>(loadSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
      );
      setSaved(true);
      const timer = window.setTimeout(
        () => setSaved(false),
        1500
      );
      return () => window.clearTimeout(timer);
    } catch {
      // Ignore localStorage errors.
    }
  }, [settings]);

  const toggle = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="w-full">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="hms-heading mb-1">Notifications</h2>
          <p className="hms-subheading">
            Choose which changes you want to be notified about
            and how you receive them.
          </p>
        </div>
        {saved && (
          <span className="text-xs font-medium text-green-600">
            Saved
          </span>
        )}
      </div>

      <div className="space-y-6">
        {TYPE_GROUPS.map((group) => (
          <section
            key={group.title}
            className="rounded-xl border p-5"
          >
            <h3 className="text-sm font-semibold text-gray-900">
              {group.title}
            </h3>
            <p className="mb-4 text-xs text-gray-500">
              {group.description}
            </p>

            <div className="space-y-4">
              {group.items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.description}
                    </p>
                  </div>
                  <Switch
                    checked={settings[item.key]}
                    onCheckedChange={() => toggle(item.key)}
                    aria-label={item.label}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-900">
            Delivery channels
          </h3>
          <p className="mb-4 text-xs text-gray-500">
            How you want to receive notifications.
          </p>

          <div className="space-y-4">
            {CHANNELS.map((channel) => (
              <div
                key={channel.key}
                className="flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {channel.label}
                  </p>
                  <p className="text-xs text-gray-500">
                    {channel.description}
                  </p>
                </div>
                <Switch
                  checked={settings[channel.key]}
                  onCheckedChange={() => toggle(channel.key)}
                  aria-label={channel.label}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
