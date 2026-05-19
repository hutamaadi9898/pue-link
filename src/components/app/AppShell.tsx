import { CalendarDays, Home, LogOut, MapPin, Settings, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  title?: string;
  eyebrow?: string;
  description?: string;
  accountName?: string;
  accountRole?: string;
};

const nav = [
  { label: "Home", zh: "首页", href: "/dashboard", icon: Home },
  { label: "Locations", zh: "地点", href: "/locations", icon: MapPin },
  { label: "Calendar", zh: "日历", href: "/calendar", icon: CalendarDays },
  { label: "Settings", zh: "设置", href: "/settings", icon: Settings }
];

function roleLabel(role?: string) {
  if (role === "super_admin") return "Super Admin";
  if (role === "family_member") return "Family Member";
  if (role === "device") return "Device";
  if (role === "public_place") return "Public Place";
  return "Demo";
}

function signOut() {
  window.location.assign("/logout");
}

export function AppShell({
  title = "Dashboard",
  eyebrow = "Overview",
  description = "Welcome back.",
  accountName = "Demo Family",
  accountRole = "family_member"
}: Props) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[15rem_1fr]">
        <aside className="rounded-lg border bg-card p-4 shadow-sm lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)]">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <p className="font-bold leading-none">Pue Link</p>
              <p className="mt-1 text-xs text-muted-foreground">{roleLabel(accountRole)}</p>
            </div>
          </div>

          <nav className="mt-5 grid gap-1">
            {nav.map((item) => (
              <a
                key={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  item.href === "/calendar" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                href={item.href}
              >
                <item.icon className="size-4" />
                <span className="i18n-en">{item.label}</span><span className="i18n-zh">{item.zh}</span>
              </a>
            ))}
          </nav>

          <div className="mt-6 rounded-md border bg-background p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground"><span className="i18n-en">Active account</span><span className="i18n-zh">当前账号</span></p>
            <p className="mt-2 text-sm font-bold">{accountName}</p>
            <Badge variant="secondary" className="mt-3">
              {roleLabel(accountRole)}
            </Badge>
          </div>

          <Button variant="outline" className="mt-4 w-full justify-start" onClick={signOut}>
            <LogOut className="size-4" />
            <span className="i18n-en">Sign out</span><span className="i18n-zh">退出</span>
          </Button>
        </aside>

        <section className="grid gap-5">
          <header className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-muted-foreground">{eyebrow}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-normal md:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          </header>

          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="font-bold"><span className="i18n-en">Calendar history</span><span className="i18n-zh">日历历史</span></h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              <span className="i18n-en">Calendar playback history is planned for the next phase. Scanner playback logs are already being written for this view.</span>
              <span className="i18n-zh">日历播放历史将在下一阶段实现。扫描播放记录已经写入，可供此页面使用。</span>
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}
