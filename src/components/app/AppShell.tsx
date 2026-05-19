import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Home,
  LogOut,
  MapPin,
  QrCode,
  ScanLine,
  Settings,
  ShieldCheck,
  UploadCloud,
  Video
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  active?: boolean;
};

type Props = {
  title?: string;
  eyebrow?: string;
  description?: string;
  accountName?: string;
  accountRole?: string;
  variant?: "dashboard" | "admin" | "device" | "place";
};

const nav: NavItem[] = [
  { label: "Beranda", href: "/dashboard", icon: Home, active: true },
  { label: "Video", href: "/locations", icon: Video },
  { label: "Lokasi", href: "/locations", icon: MapPin },
  { label: "Kalender", href: "/calendar", icon: CalendarDays },
  { label: "Pengaturan", href: "/settings", icon: Settings }
];

const metrics = [
  ["Total pemutaran", "1,248", "+12.5% dari minggu lalu"],
  ["Total video", "27", "+3 video baru"],
  ["Lokasi aktif", "8", "+1 lokasi baru"],
  ["Video overuse", "3", "Perlu diperbarui"]
];

const rows = [
  ["Hari ini, 14:32", "Minimarket Sejahtera", "Ucapan Nenek", "Gelang Oma", "00:28"],
  ["Hari ini, 11:08", "Taman Bungkul", "Video Lucu Keluarga", "Gelang Mama", "00:31"],
  ["Kemarin, 18:45", "Cafe Tepi Danau", "Happy Birthday Ayah", "Gelang Papa", "00:26"],
  ["Kemarin, 16:21", "Minimarket Sejahtera", "Kangen Kalian", "Gelang Adik", "00:29"]
];

const slots = [
  ["Slot 1", "Ucapan Nenek", "7 kali diputar", "Aktif"],
  ["Slot 2", "Happy Birthday Ayah", "4 kali diputar", "Aktif"],
  ["Slot 3", "Kangen Kalian", "5 kali diputar", "Perlu refresh"]
];

function roleLabel(role?: string) {
  if (role === "super_admin") return "Super Admin";
  if (role === "family_member") return "Family Member";
  if (role === "device") return "Device";
  if (role === "public_place") return "Public Place";
  return "Demo";
}

async function signOut() {
  await authClient.signOut();
  window.location.assign("/login");
}

export function AppShell({
  title = "Ringkasan",
  eyebrow = "Dashboard",
  description = "Halo, selamat datang kembali.",
  accountName = "Keluarga Bahagia",
  accountRole = "family_member",
  variant = "dashboard"
}: Props) {
  if (variant === "device") {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-8">
        <section className="w-full max-w-sm rounded-lg border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-md bg-primary text-primary-foreground">
            <QrCode className="size-6" />
          </div>
          <h1 className="mt-5 text-xl font-bold">Gelang Demo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tampilkan kode ini ke mesin publik.</p>
          <div className="mt-6 grid aspect-square place-items-center rounded-lg border bg-background">
            <div className="grid size-40 place-items-center rounded-md border-4 border-foreground text-center font-mono text-xs font-bold">
              PUE DEMO
            </div>
          </div>
          <p className="mt-4 rounded-md bg-muted px-3 py-2 font-mono text-xs">pue_DEMO_BRACELET_001</p>
          <Button variant="outline" className="mt-6 w-full" onClick={signOut}>
            <LogOut className="size-4" />
            Keluar
          </Button>
        </section>
      </main>
    );
  }

  if (variant === "place") {
    return (
      <main className="grid min-h-screen bg-slate-950 px-4 py-6 text-white">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-primary">
              <ScanLine className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Pue Link Kiosk</p>
              <p className="text-xs text-white/60">{accountName}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={signOut}>
            Keluar
          </Button>
        </header>
        <section className="mx-auto grid w-full max-w-5xl place-items-center">
          <div className="w-full max-w-xl rounded-lg border border-white/10 bg-white/5 p-8 text-center">
            <ScanLine className="mx-auto size-14 text-primary" />
            <h1 className="mt-5 text-2xl font-bold">Scan QR gelang Anda</h1>
            <p className="mt-2 text-sm text-white/60">Mesin akan memilih video dengan jumlah pemutaran paling sedikit.</p>
            <div className="mt-8 rounded-md border border-white/10 bg-slate-900 p-4">
              <input
                className="h-11 w-full rounded-md border border-white/10 bg-white px-3 text-sm text-foreground outline-none focus:border-primary"
                placeholder="Masukkan token barcode manual"
              />
              <Button className="mt-3 w-full">Mulai playback</Button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const activeNav = variant === "admin" ? [{ label: "Admin", href: "/admin", icon: ShieldCheck, active: true }, ...nav.slice(1, 3)] : nav;

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
            {activeNav.map((item) => (
              <a
                key={item.label}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  item.active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                href={item.href}
              >
                <item.icon className="size-4" />
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-6 rounded-md border bg-background p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Akun aktif</p>
            <p className="mt-2 text-sm font-bold">{accountName}</p>
            <Badge variant="secondary" className="mt-3">
              {roleLabel(accountRole)}
            </Badge>
          </div>

          <Button variant="outline" className="mt-4 w-full justify-start" onClick={signOut}>
            <LogOut className="size-4" />
            Keluar
          </Button>
        </aside>

        <section className="grid gap-5">
          <header className="flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-sm md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{eyebrow}</p>
              <h1 className="mt-2 text-2xl font-bold tracking-normal md:text-3xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
            <Button>
              <UploadCloud className="size-4" />
              Upload Video
            </Button>
          </header>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value, note]) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardDescription>{label}</CardDescription>
                  <CardTitle className="text-2xl">{value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={label === "Video overuse" ? "text-xs font-semibold text-destructive" : "text-xs font-semibold text-emerald-600"}>{note}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Pemutaran terbaru</CardTitle>
                <CardDescription>Riwayat singkat dari lokasi publik.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Video</TableHead>
                      <TableHead>Gelang</TableHead>
                      <TableHead>Durasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.join("-")}>
                        {row.map((cell, index) => (
                          <TableCell key={cell} className={index === 2 ? "font-semibold" : "text-muted-foreground"}>
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Slot Minimarket</CardTitle>
                <CardDescription>Tiga posisi video aktif untuk lokasi ini.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {slots.map(([slot, title, count, status]) => (
                  <div key={slot} className="rounded-md border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">{slot}</p>
                        <p className="mt-1 font-semibold">{title}</p>
                      </div>
                      <Badge variant={status === "Perlu refresh" ? "destructive" : "success"}>{status}</Badge>
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-3.5" />
                      {count}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Phase 1-3 status</CardTitle>
              <CardDescription>Foundation, Cloudflare bindings, and role-based auth are wired for MVP development.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-3">
              {["UI shell minimalis", "D1/R2 bindings", "Better Auth login"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-semibold">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
