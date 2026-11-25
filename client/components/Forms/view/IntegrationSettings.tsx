import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { TestTube, Mail, MessageSquare, Smartphone, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import integrationApi, {
  IntegrationProvider,
  UserIntegrationSettings,
  UpdateUserIntegrationSettingsInput,
} from "@/api/integration.api";
import { useToast } from "@/components/ui/use-toast";

const CHANNEL_CONFIG = [
  {
    key: "email" as const,
    label: "Email",
    icon: Mail,
    description: "Send notifications via email (SMTP)",
    providerType: "EMAIL" as const,
    disabledReason: "Requires SMTP configuration",
  },
  {
    key: "sms" as const,
    label: "SMS",
    icon: Smartphone,
    description: "Send notifications via SMS (TextBee)",
    providerType: "SMS" as const,
    disabledReason: "Requires TextBee configuration",
  },
  {
    key: "whatsapp" as const,
    label: "WhatsApp",
    icon: MessageSquare,
    description: "Send notifications via WhatsApp (Twilio/WhatsApp Business API)",
    providerType: "WHATSAPP" as const,
    disabledReason: "Requires WhatsApp Business API configuration",
  },
  {
    key: "in_app" as const,
    label: "In-App",
    icon: TestTube,
    description: "Show notifications inside the application",
    providerType: null,
    disabledReason: null,
  },
] as const;

// Sample payloads shown when an administrator runs a provider test. Delivery is
// simulated for now; these mirror the text each channel will eventually send.
const TEST_MESSAGES: Record<"EMAIL" | "SMS" | "WHATSAPP", string> = {
  EMAIL: "Hello this is example mail check",
  SMS: "Hello this is example mobile check",
  WHATSAPP: "Hello this is example WhatsApp check",
};

const TEST_LABELS: Record<"EMAIL" | "SMS" | "WHATSAPP", string> = {
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
};

export default function IntegrationSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserIntegrationSettings | null>(null);
  const [providers, setProviders] = useState<Record<string, IntegrationProvider[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "success" | "error" | null>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, emailProviders, smsProviders, whatsappProviders] = await Promise.all([
        integrationApi.getUserSettings(),
        integrationApi.getProviders().catch(() => ({ data: { data: [] } })),
        integrationApi.getProviders().catch(() => ({ data: { data: [] } })),
        integrationApi.getProviders().catch(() => ({ data: { data: [] } })),
      ]);

      setSettings(settingsRes.data.data);

      const allProviders = [
        ...emailProviders.data.data,
        ...smsProviders.data.data,
        ...whatsappProviders.data.data,
      ];

      const grouped = allProviders.reduce((acc, p) => {
        if (!acc[p.provider_type]) acc[p.provider_type] = [];
        acc[p.provider_type].push(p);
        return acc;
      }, {} as Record<string, IntegrationProvider[]>);

      setProviders(grouped);
    } catch (err) {
      console.error("Failed to load integration settings:", err);
      toast({
        title: "Error",
        description: "Failed to load integration settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggle = async (channelKey: keyof UserIntegrationSettings) => {
    if (!settings) return;

    const validKeys = ["email_enabled", "sms_enabled", "whatsapp_enabled", "in_app_enabled"] as const;
    if (!validKeys.includes(channelKey as any)) return;

    const newSettings: UpdateUserIntegrationSettingsInput = {
      [channelKey]: !settings[channelKey],
    };

    try {
      setSaving(true);
      const res = await integrationApi.updateUserSettings(newSettings);
      setSettings(res.data.data);
      toast({
        title: "Saved",
        description: "Integration settings updated",
      });
    } catch (err) {
      console.error("Failed to update settings:", err);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestProvider = async (providerType: "EMAIL" | "SMS" | "WHATSAPP") => {
    const provider = getProviderForType(providerType);

    if (!provider?.is_active) {
      toast({
        title: "Provider not enabled",
        description: `Enable the ${TEST_LABELS[providerType]} provider before sending a test message.`,
        variant: "destructive",
      });
      return;
    }

    setTesting(providerType);
    setTestResults((prev) => ({ ...prev, [providerType]: null }));

    try {
      // Delivery is simulated until real channel sending is defined. The toast
      // shows the sample payload so operators can confirm the channel selection.
      await new Promise((resolve) => setTimeout(resolve, 800));
      setTestResults((prev) => ({ ...prev, [providerType]: "success" }));
      toast({
        title: `Test ${TEST_LABELS[providerType]} message`,
        description: TEST_MESSAGES[providerType],
      });
    } catch (err: any) {
      setTestResults((prev) => ({ ...prev, [providerType]: "error" }));
      toast({
        title: "Test Failed",
        description: err?.message || `${TEST_LABELS[providerType]} test failed`,
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const getProviderForType = (type: "EMAIL" | "SMS" | "WHATSAPP") => {
    return providers[type]?.[0] || null;
  };

  const hasProvider = (type: "EMAIL" | "SMS" | "WHATSAPP") => {
    return getProviderForType(type) !== null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="mb-8">
        <h2 className="hms-heading mb-1">Integrations</h2>
        <p className="hms-subheading">
          Configure how you want to send and receive notifications.
          Each channel requires a valid provider configuration.
        </p>
      </div>

      <div className="space-y-4">
        {CHANNEL_CONFIG.map((channel) => {
          const settingKey = `${channel.key}_enabled` as "email_enabled" | "sms_enabled" | "whatsapp_enabled" | "in_app_enabled";
          const isEnabled = settings?.[settingKey] ?? false;
          const providerType = channel.providerType;
          const provider = providerType ? getProviderForType(providerType) : null;
          const hasProviderConfig = providerType ? hasProvider(providerType) : true;
          const testResult = providerType ? testResults[providerType] : null;
          const isTesting = testing === providerType;

          return (
            <section
              key={channel.key}
              className="rounded-xl border border-gray-200 dark:border-slate-800 dark:bg-slate-900/40 p-5 transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={`p-3 rounded-lg ${
                      isEnabled
                        ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400"
                        : "bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500"
                    }`}
                  >
                    <channel.icon size={20} className={isEnabled ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100 truncate">{channel.label}</h3>
                      {!hasProviderConfig && providerType && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-full">
                          Not Configured
                        </span>
                      )}
                      {testResult === "success" && (
                        <CheckCircle size={16} className="text-green-500" />
                      )}
                      {testResult === "error" && (
                        <AlertCircle size={16} className="text-red-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 truncate">{channel.description}</p>
                    {provider && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Using: {provider.provider_name} {provider.is_default && "(Default)"}
                      </p>
                    )}
                    {!hasProviderConfig && providerType && channel.disabledReason && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{channel.disabledReason}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggle(settingKey)}
                    disabled={providerType !== null && !hasProviderConfig}
                    aria-label={channel.label}
                  />
                  {providerType && provider?.is_active && (
                    <button
                      onClick={() => handleTestProvider(providerType)}
                      disabled={isTesting || saving}
                      className="text-xs px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg transition disabled:opacity-50"
                    >
                      {isTesting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        "Test"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-slate-800 dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">Provider Configuration</h3>
          <p className="hms-subheading dark:text-slate-400">
            Provider configurations are managed by administrators. Contact your system
            administrator to set up Email (SMTP), SMS (TextBee), or WhatsApp providers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {["EMAIL", "SMS", "WHATSAPP"].map((type) => {
            const provider = getProviderForType(type as "EMAIL" | "SMS" | "WHATSAPP");
            const configured = provider !== null;
            const iconCls = configured
              ? "p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400"
              : "p-2 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400";
            const isTesting = testing === type;
            return (
              <div
                key={type}
                className="rounded-lg border p-5 flex flex-col gap-4 dark:border-slate-800 dark:bg-slate-900/50 border-gray-200 bg-white transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={iconCls}>
                    {type === "EMAIL" ? (
                      <Mail size={18} />
                    ) : type === "SMS" ? (
                      <Smartphone size={18} />
                    ) : (
                      <MessageSquare size={18} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-slate-100 capitalize">
                        {type.toLowerCase()}
                      </span>
                      {provider?.is_default && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                          Default
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-medium uppercase tracking-wide ${
                      provider?.is_active
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}>
                      {configured ? (provider.is_active ? "Active" : "Inactive") : "Not configured"}
                    </span>
                  </div>
                </div>

                {configured ? (
                  <>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-gray-700 dark:text-slate-300">
                        {provider.provider_name}
                      </p>
                      {provider.provider_type === "SMS" && provider.config && (
                        <div className="rounded-lg border p-3 border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                            TextBee Device ID
                          </p>
                          <p className="text-sm break-all text-gray-900 dark:text-slate-200">
                            {provider.config.deviceId || "Not set"}
                          </p>
                        </div>
                      )}
                      {provider.provider_type === "EMAIL" && provider.config && (
                        <div className="rounded-lg border p-3 border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                                SMTP Host
                              </p>
                              <p className="text-sm break-all text-gray-900 dark:text-slate-200">
                                {provider.config.host || "Not set"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                                Port
                              </p>
                              <p className="text-sm break-all text-gray-900 dark:text-slate-200">
                                {provider.config.port ?? 587}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {provider.provider_type === "WHATSAPP" && provider.config && (
                        <div className="rounded-lg border p-3 border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                            API URL
                          </p>
                          <p className="text-sm break-all text-gray-900 dark:text-slate-200">
                            {provider.config.apiUrl || "Not set"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => handleTestProvider(type as "EMAIL" | "SMS" | "WHATSAPP")}
                        disabled={!provider.is_active || isTesting || saving}
                        title={
                          provider.is_active
                            ? "Send a test message"
                            : "Enable this provider to send a test message"
                        }
                        className={`w-fit px-3 py-1.5 rounded-lg text-xs font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed ${
                          provider.is_active && !isTesting && !saving
                            ? "text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                            : "text-gray-400 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800"
                        }`}
                      >
                        {isTesting ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 size={14} className="animate-spin" />
                            Testing…
                          </span>
                        ) : (
                          "Test"
                        )}
                      </button>
                      {!provider.is_active && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400">
                          Enable this provider to run a test
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      No provider configured.
                    </p>
                    <button
                      onClick={() => {}}
                      className="w-fit px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Configure
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}