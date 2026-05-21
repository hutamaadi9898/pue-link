import * as React from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: OneSignalSdk) => void | Promise<void>>;
    PueLinkOneSignalInitError?: string;
  }
}

type OneSignalSdk = {
  Notifications: {
    permission: boolean;
    isPushSupported: () => boolean;
    requestPermission: () => Promise<boolean | void>;
  };
  User: {
    PushSubscription: {
      id: string | null;
      optedIn?: boolean;
      optIn?: () => Promise<void>;
      optOut?: () => Promise<void>;
    };
  };
};

type Status = "idle" | "busy" | "success" | "error";

type Props = {
  appId: string;
  canSendNotifications: boolean;
  initialLanguage: "en" | "zh";
};

export function PushSettings({ appId, canSendNotifications, initialLanguage }: Props) {
  const [status, setStatus] = React.useState<Status>("idle");
  const [testStatus, setTestStatus] = React.useState<Status>("idle");
  const [message, setMessage] = React.useState("");
  const [subscriptionId, setSubscriptionId] = React.useState<string | null>(null);
  const [language, setLanguage] = React.useState<"en" | "zh">(initialLanguage);

  const withOneSignal = React.useCallback((callback: (OneSignal: OneSignalSdk) => Promise<void>) => {
    if (!appId) {
      setStatus("error");
      setMessage("OneSignal App ID is not configured.");
      return;
    }

    if (window.PueLinkOneSignalInitError) {
      setStatus("error");
      setMessage(window.PueLinkOneSignalInitError);
      return;
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        if (window.PueLinkOneSignalInitError) {
          throw new Error(window.PueLinkOneSignalInitError);
        }
        await callback(OneSignal);
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "OneSignal could not initialize.");
      }
    });
  }, [appId]);

  const registerSubscription = React.useCallback(async (id: string) => {
    const response = await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onesignal_player_id: id, enabled: true })
    });
    const payload = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Could not register this browser.");
    }
  }, []);

  const syncCurrentSubscription = React.useCallback((showSuccess: boolean) => {
    withOneSignal(async (OneSignal) => {
      if (!OneSignal.Notifications.isPushSupported()) {
        setStatus("error");
        setMessage("This browser does not support web push.");
        return;
      }

      const id = OneSignal.User.PushSubscription.id;
      setSubscriptionId(id);
      if (!id) return;

      await registerSubscription(id);
      if (showSuccess) {
        setStatus("success");
        setMessage("Notifications are enabled on this browser.");
      }
    });
  }, [registerSubscription, withOneSignal]);

  React.useEffect(() => {
    syncCurrentSubscription(false);
  }, [syncCurrentSubscription]);

  const enableNotifications = () => {
    setStatus("busy");
    setMessage("");
    withOneSignal(async (OneSignal) => {
      if (!OneSignal.Notifications.isPushSupported()) {
        setStatus("error");
        setMessage("This browser does not support web push.");
        return;
      }

      await OneSignal.Notifications.requestPermission();
      if (OneSignal.User.PushSubscription.optIn) {
        await OneSignal.User.PushSubscription.optIn();
      }

      const id = OneSignal.User.PushSubscription.id;
      setSubscriptionId(id);

      if (!id) {
        setStatus("error");
        setMessage("Permission was handled, but this browser is not subscribed yet. Try again in a few seconds.");
        return;
      }

      await registerSubscription(id);
      setStatus("success");
      setMessage("Notifications are enabled on this browser.");
    });
  };

  const disableNotifications = () => {
    setStatus("busy");
    setMessage("");
    withOneSignal(async (OneSignal) => {
      if (OneSignal.User.PushSubscription.optOut) {
        await OneSignal.User.PushSubscription.optOut();
      }
      setSubscriptionId(null);
      setStatus("success");
      setMessage("Notifications are off on this browser.");
    });
  };

  const saveLanguage = async (nextLanguage: "en" | "zh") => {
    setLanguage(nextLanguage);
    setMessage("");
    const response = await fetch("/api/push/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: nextLanguage })
    });
    const payload = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !payload.ok) {
      setStatus("error");
      setMessage(payload.error || "Could not save notification language.");
      return;
    }
    setStatus("success");
    setMessage("Notification language saved.");
  };

  const sendTest = async () => {
    if (!canSendNotifications) {
      setTestStatus("error");
      setMessage("Notification sending is not configured yet.");
      return;
    }

    setTestStatus("busy");
    setMessage("");
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const payload = await response.json() as { ok?: boolean; error?: string; data?: { recipients?: number } };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Test notification failed.");
      }
      setTestStatus("success");
      setMessage(
        typeof payload.data?.recipients === "number"
          ? `Test sent to ${payload.data.recipients} subscribed browser(s).`
          : "Test notification sent."
      );
    } catch (error) {
      setTestStatus("error");
      setMessage(error instanceof Error ? error.message : "Test notification failed.");
    }
  };

  const isSubscribed = Boolean(subscriptionId);

  return (
    <section className="app-panel grid gap-4">
      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground">
          <span className="i18n-en">Notifications</span><span className="i18n-zh">通知</span>
        </p>
        <h2 className="mt-1 text-lg font-bold">
          <span className="i18n-en">Family refresh alerts</span><span className="i18n-zh">家庭更新提醒</span>
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          <span className="i18n-en">Alerts go to every browser subscribed by this family account.</span>
          <span className="i18n-zh">提醒会发送到此家庭账户已订阅的所有浏览器。</span>
        </p>
      </div>

      {message && (
        <p className={`rounded-md border px-3 py-2 text-sm font-semibold ${
          status === "error" || testStatus === "error"
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}>
          {message}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" onClick={isSubscribed ? disableNotifications : enableNotifications} disabled={!appId || status === "busy"}>
          {isSubscribed ? <BellOff /> : <Bell />}
          <span className="i18n-en">{isSubscribed ? "Notifications on" : "Enable notifications"}</span>
          <span className="i18n-zh">{isSubscribed ? "通知已开启" : "启用通知"}</span>
        </Button>
        <Button type="button" variant="outline" onClick={sendTest} disabled={!appId || !isSubscribed || !canSendNotifications || testStatus === "busy"}>
          <Send />
          <span className="i18n-en">Send test</span>
          <span className="i18n-zh">发送测试</span>
        </Button>
        <div className="inline-flex h-10 rounded-md border bg-background p-1">
          <button
            className={`rounded px-3 text-sm font-semibold ${language === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            type="button"
            onClick={() => void saveLanguage("en")}
          >
            English
          </button>
          <button
            className={`rounded px-3 text-sm font-semibold ${language === "zh" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            type="button"
            onClick={() => void saveLanguage("zh")}
          >
            中文
          </button>
        </div>
      </div>
    </section>
  );
}
