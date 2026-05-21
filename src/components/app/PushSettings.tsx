import * as React from "react";
import { Bell, Send, ShieldCheck } from "lucide-react";
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
      addEventListener?: (event: "change", callback: () => void) => void;
    };
  };
};

type Status = "idle" | "busy" | "success" | "error";

type Props = {
  appId: string;
  canSendNotifications: boolean;
  initialSubscriptionCount: number;
};

export function PushSettings({ appId, canSendNotifications, initialSubscriptionCount }: Props) {
  const [status, setStatus] = React.useState<Status>("idle");
  const [testStatus, setTestStatus] = React.useState<Status>("idle");
  const [message, setMessage] = React.useState("");
  const [subscriptionId, setSubscriptionId] = React.useState<string | null>(null);
  const [permission, setPermission] = React.useState<"granted" | "blocked" | "unknown">("unknown");

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

      setPermission(OneSignal.Notifications.permission ? "granted" : "unknown");
      const id = OneSignal.User.PushSubscription.id;
      setSubscriptionId(id);
      if (!id) return;

      await registerSubscription(id);
      if (showSuccess) {
        setStatus("success");
        setMessage("This browser is subscribed for refresh recommendations.");
      }
    });
  }, [registerSubscription, withOneSignal]);

  React.useEffect(() => {
    syncCurrentSubscription(false);
  }, [syncCurrentSubscription]);

  const subscribe = () => {
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
      setPermission(OneSignal.Notifications.permission ? "granted" : "blocked");
      setSubscriptionId(id);

      if (!id) {
        setStatus("error");
        setMessage("Permission was handled, but OneSignal has not returned a subscription ID yet. Try again in a few seconds.");
        return;
      }

      await registerSubscription(id);
      setStatus("success");
      setMessage("This browser is subscribed for refresh recommendations.");
    });
  };

  const sendTest = async () => {
    if (!canSendNotifications) {
      setTestStatus("error");
      setMessage("OneSignal REST API key is missing on the Worker. Add ONESIGNAL_REST_API_KEY before sending tests.");
      return;
    }

    setTestStatus("busy");
    setMessage("");
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const payload = await response.json() as { ok?: boolean; error?: string; data?: { recipients?: number; notificationId?: string } };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Test notification failed.");
      }
      setTestStatus("success");
      setMessage(
        typeof payload.data?.recipients === "number"
          ? `Test notification sent to ${payload.data.recipients} recipient(s).`
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">
            <span className="i18n-en">Web push</span><span className="i18n-zh">网页推送</span>
          </p>
          <h2 className="mt-1 text-lg font-bold">
            <span className="i18n-en">Refresh notifications</span><span className="i18n-zh">更新提醒</span>
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            <span className="i18n-en">Subscribe this browser so the family account receives a recommendation when a video reaches its refresh limit.</span>
            <span className="i18n-zh">订阅此浏览器，当视频达到更新上限时接收家庭提醒。</span>
          </p>
        </div>
        <div className="rounded-md border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground">
          {initialSubscriptionCount} <span className="i18n-en">saved browser(s)</span><span className="i18n-zh">个已保存浏览器</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs font-semibold text-muted-foreground">App ID</p>
          <p className="mt-1 truncate text-sm font-bold">{appId || "Not configured"}</p>
        </div>
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs font-semibold text-muted-foreground">Permission</p>
          <p className="mt-1 text-sm font-bold capitalize">{permission}</p>
        </div>
        <div className="rounded-md border bg-background p-3">
          <p className="text-xs font-semibold text-muted-foreground">Subscription</p>
          <p className="mt-1 truncate text-sm font-bold">{subscriptionId || "Not registered"}</p>
        </div>
        <div className="rounded-md border bg-background p-3 sm:col-span-3">
          <p className="text-xs font-semibold text-muted-foreground">Send status</p>
          <p className={`mt-1 text-sm font-bold ${canSendNotifications ? "text-emerald-700" : "text-destructive"}`}>
            {canSendNotifications ? "Server API key configured" : "Missing ONESIGNAL_REST_API_KEY"}
          </p>
        </div>
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={subscribe} disabled={!appId || status === "busy"}>
          {isSubscribed ? <ShieldCheck /> : <Bell />}
          <span className="i18n-en">{isSubscribed ? "Sync subscription" : "Enable notifications"}</span>
          <span className="i18n-zh">{isSubscribed ? "同步订阅" : "启用通知"}</span>
        </Button>
        <Button type="button" variant="outline" onClick={sendTest} disabled={!appId || !isSubscribed || !canSendNotifications || testStatus === "busy"}>
          <Send />
          <span className="i18n-en">Send test</span>
          <span className="i18n-zh">发送测试</span>
        </Button>
      </div>
    </section>
  );
}
