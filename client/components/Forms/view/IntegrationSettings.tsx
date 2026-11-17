import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { TestTube, Mail, MessageSquare, Smartphone, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import integrationApi, {
  IntegrationProvider,
  UserIntegrationSettings,
  UpdateUserIntegrationSettingsInput,
} from "@/api/integration.api";
import { useToast } from "@/components/ui/use-toast";
import axios from "@/api/axios";

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
    description: "Send notifications via SMS (Twilio)",
    providerType: "SMS" as const,
    disabledReason: "Requires Twilio configuration",
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
    key: "inApp" as const,
    label: "In-App",
    icon: TestTube,
    description: "Show notifications inside the application",
    providerType: null,
    disabledReason: null,
  },
] as const;

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
    setTesting(providerType);
    setTestResults((prev) => ({ ...prev, [providerType]: null }));

    try {
      const configRes = await integrationApi.getProviderConfig(providerType);
      const config = configRes.data.data;

      if (providerType === "EMAIL") {
        await testEmailConfig(config);
      } else if (providerType === "SMS") {
        await testSmsConfig(config);
      } else if (providerType === "WHATSAPP") {
        await testWhatsAppConfig(config);
      }

      setTestResults((prev) => ({ ...prev, [providerType]: "success" }));
      toast({
        title: "Test Successful",
        description: `${providerType} configuration is working`,
      });
    } catch (err: any) {
      setTestResults((prev) => ({ ...prev, [providerType]: "error" }));
      toast({
        title: "Test Failed",
        description: err?.response?.data?.message || `${providerType} test failed`,
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const testEmailConfig = async (config: any) => {
    await axios.post("/api/integrations/test/email", config);
  };

  const testSmsConfig = async (config: any) => {
    await axios.post("/api/integrations/test/sms", config);
  };

  const testWhatsAppConfig = async (config: any) => {
    await axios.post("/api/integrations/test/whatsapp", config);
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
              className="rounded-xl border p-5 transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={`p-3 rounded-lg ${
                      isEnabled ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <channel.icon size={20} className={isEnabled ? "text-blue-600" : "text-gray-400"} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 truncate">{channel.label}</h3>
                      {!hasProviderConfig && providerType && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
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
                    <p className="text-xs text-gray-500 mt-1 truncate">{channel.description}</p>
                    {provider && (
                      <p className="text-xs text-blue-600 mt-1">
                        Using: {provider.provider_name} {provider.is_default && "(Default)"}
                      </p>
                    )}
                    {!hasProviderConfig && providerType && channel.disabledReason && (
                      <p className="text-xs text-amber-600 mt-1">{channel.disabledReason}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggle(settingKey)}
                    disabled={!hasProviderConfig && providerType !== null}
                    aria-label={channel.label}
                  />
                  {providerType && hasProviderConfig && (
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

      <div className="rounded-xl border p-5 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Provider Configuration</h3>
        <p className="text-xs text-gray-500 mb-4">
          Provider configurations are managed by administrators in the admin panel.
          Contact your system administrator to set up Email (SMTP), SMS (Twilio), or WhatsApp providers.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["EMAIL", "SMS", "WHATSAPP"].map((type) => {
            const provider = getProviderForType(type as "EMAIL" | "SMS" | "WHATSAPP");
            return (
              <div
                key={type}
                className={`p-4 rounded-lg border ${
                  provider ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium capitalize">{type.toLowerCase()}</span>
                  {provider && provider.is_default && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Default</span>
                  )}
                </div>
                {provider ? (
                  <>
                    <p className="text-sm text-gray-700">{provider.provider_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {provider.is_active ? "Active" : "Inactive"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Not configured</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}