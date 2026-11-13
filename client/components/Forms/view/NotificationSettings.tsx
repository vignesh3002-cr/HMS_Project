import { useEffect, useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { getUser } from "@/utils/token";
import { useToast } from "@/components/ui/use-toast";
import integrationApi, { UserIntegrationSettings } from "@/api/integration.api";

const SETTINGS_KEY = "hms_notification_settings";

type NotificationTypeSettings = {
  patientCreated: boolean;
  patientUpdated: boolean;
  employeeCreated: boolean;
  employeeUpdated: boolean;
  employeeDeleted: boolean;
  appointmentCreated: boolean;
  appointmentUpdated: boolean;
  appointmentCancelled: boolean;
};

const DEFAULT_TYPE_SETTINGS: NotificationTypeSettings = {
  patientCreated: true,
  patientUpdated: true,
  employeeCreated: true,
  employeeUpdated: true,
  employeeDeleted: true,
  appointmentCreated: true,
  appointmentUpdated: true,
  appointmentCancelled: true,
};

function loadTypeSettings(): NotificationTypeSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_TYPE_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_TYPE_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_TYPE_SETTINGS };
  }
}

const TYPE_GROUPS: {
  title: string;
  description: string;
  items: {
    key: keyof NotificationTypeSettings;
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
        description: "Notify me when a new patient is registered.",
      },
      {
        key: "patientUpdated",
        label: "Patient updated",
        description: "Notify me when a patient's details are updated.",
      },
    ],
  },
  {
    title: "Employees",
    description: "Alerts about staff, doctor and admin accounts.",
    items: [
      {
        key: "employeeCreated",
        label: "Employee created",
        description: "Notify me when a new employee is added.",
      },
      {
        key: "employeeUpdated",
        label: "Employee updated",
        description: "Notify me when an employee's details are updated.",
      },
      {
        key: "employeeDeleted",
        label: "Employee deleted",
        description: "Notify me when an employee is removed.",
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
        description: "Notify me when a new appointment is booked.",
      },
      {
        key: "appointmentUpdated",
        label: "Appointment updated",
        description: "Notify me when an appointment is rescheduled or changed.",
      },
      {
        key: "appointmentCancelled",
        label: "Appointment cancelled",
        description: "Notify me when an appointment is cancelled.",
      },
    ],
  },
];

const CHANNEL_KEYS = {
  channelInApp: "in_app_enabled",
  channelEmail: "email_enabled",
  channelSms: "sms_enabled",
} as const;

export default function NotificationSettings() {
  const { toast } = useToast();
  const [typeSettings, setTypeSettings] = useState<NotificationTypeSettings>(loadTypeSettings);
  const [integrationSettings, setIntegrationSettings] = useState<UserIntegrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [savingChannel, setSavingChannel] = useState<string | null>(null);

  const isDoctor = useMemo(() => {
    const user = getUser();
    return String(user?.role_type || "").toUpperCase() === "DOCTOR";
  }, []);

  useEffect(() => {
    const fetchIntegrationSettings = async () => {
      try {
        const res = await integrationApi.getUserSettings();
        setIntegrationSettings(res.data.data);
      } catch (err) {
        console.error("Failed to load integration settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchIntegrationSettings();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(typeSettings));
      setSaved(true);
      const timer = window.setTimeout(() => setSaved(false), 1500);
      return () => window.clearTimeout(timer);
    } catch {
      // Ignore localStorage errors.
    }
  }, [typeSettings]);

  const toggleType = (key: keyof NotificationTypeSettings) => {
    setTypeSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleChannel = async (channelKey: keyof typeof CHANNEL_KEYS) => {
    const backendKey = CHANNEL_KEYS[channelKey];
    if (!integrationSettings) return;

    const newValue = !integrationSettings[backendKey];
    setSavingChannel(channelKey);

    try {
      const res = await integrationApi.updateUserSettings({
        [backendKey]: newValue,
      });
      setIntegrationSettings(res.data.data);
      toast({
        title: "Saved",
        description: "Channel setting updated",
      });
    } catch (err) {
      console.error("Failed to update channel setting:", err);
      toast({
        title: "Error",
        description: "Failed to update channel setting",
        variant: "destructive",
      });
    } finally {
      setSavingChannel(null);
    }
  };

  const getChannelValue = (channelKey: keyof typeof CHANNEL_KEYS): boolean => {
    const backendKey = CHANNEL_KEYS[channelKey];
    return integrationSettings?.[backendKey] ?? false;
  };

  const visibleGroups = useMemo(() => {
    if (!isDoctor) return TYPE_GROUPS;
    return TYPE_GROUPS.filter((g) => g.title !== "Employees");
  }, [isDoctor]);

  const channelLoading = loading || savingChannel !== null;

  return (
    <div className="w-full">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="hms-heading mb-1">Notifications</h2>
          <p className="hms-subheading">
            Choose which changes you want to be notified about and how you receive them.
          </p>
        </div>
        {saved && (
          <span className="text-xs font-medium text-green-600">Saved</span>
        )}
      </div>

      {loading && (
        <div className="mb-4 text-sm text-gray-500">Loading channel settings...</div>
      )}

      <div className="space-y-6">
        {visibleGroups.map((group) => (
          <section key={group.title} className="rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-gray-900">{group.title}</h3>
            <p className="mb-4 text-xs text-gray-500">{group.description}</p>

            <div className="space-y-4">
              {group.items.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                  <Switch
                    checked={typeSettings[item.key]}
                    onCheckedChange={() => toggleType(item.key)}
                    aria-label={item.label}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-900">Delivery channels</h3>
          <p className="mb-4 text-xs text-gray-500">
            How you want to receive notifications. Channel availability depends on
            provider configuration in the Integrations tab.
          </p>

          <div className="space-y-4">
            {[
              { key: "channelInApp", label: "In-app notifications", description: "Show notifications inside the application." },
              { key: "channelEmail", label: "Email notifications", description: "Send notifications to your email address." },
              { key: "channelSms", label: "SMS notifications", description: "Send notifications to your mobile number." },
            ].map((channel) => (
              <div key={channel.key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">{channel.label}</p>
                  <p className="text-xs text-gray-500">{channel.description}</p>
                </div>
                <Switch
                  checked={getChannelValue(channel.key as keyof typeof CHANNEL_KEYS)}
                  onCheckedChange={() => toggleChannel(channel.key as keyof typeof CHANNEL_KEYS)}
                  disabled={channelLoading}
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