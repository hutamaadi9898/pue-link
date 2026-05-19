import { useState } from "react";
import { ArrowRight, Heart, Loader2, LockKeyhole, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const demoUsers = [
  { label: "Super Admin", email: "admin@puelink.test" },
  { label: "Family", email: "family@puelink.test" },
  { label: "Bracelet", email: "device-oma@puelink.test" },
  { label: "Minimarket", email: "minimarket@puelink.test" },
  { label: "Park", email: "taman@puelink.test" }
];

type Props = {
  redirectTo?: string;
};

export function LoginPage({ redirectTo = "/" }: Props) {
  const [email, setEmail] = useState(demoUsers[1].email);
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL: redirectTo
    });

    setLoading(false);
    if (result.error) {
      setError(result.error.message || "Email or password is invalid.");
      return;
    }

    window.location.assign(redirectTo);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border bg-card shadow-sm lg:grid-cols-[0.92fr_1.08fr]">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="mb-10 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <Heart className="size-5 fill-current" />
            </div>
            <div>
              <p className="text-base font-bold leading-none">Pue Link</p>
              <p className="mt-1 text-xs text-muted-foreground">Family memory console</p>
            </div>
          </div>

          <div className="max-w-sm">
            <Badge variant="secondary"><span className="i18n-en">Demo login</span><span className="i18n-zh">演示登录</span></Badge>
            <h1 className="mt-4 text-2xl font-bold tracking-normal"><span className="i18n-en">Welcome back</span><span className="i18n-zh">欢迎回来</span></h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              <span className="i18n-en">Sign in with email and password to open the screen for your account role.</span>
              <span className="i18n-zh">使用邮箱和密码登录，打开与账号角色对应的界面。</span>
            </p>
          </div>

          <form className="mt-8 grid max-w-sm gap-4" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" className="pl-9" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" className="pl-9" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
            </div>
            {error ? <p className="rounded-md border border-destructive/30 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              <span className="i18n-en">Sign in</span><span className="i18n-zh">登录</span>
            </Button>
          </form>

          <div className="mt-8 max-w-sm">
            <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground"><span className="i18n-en">Sign in as</span><span className="i18n-zh">选择登录身份</span></p>
            <div className="grid grid-cols-2 gap-2">
              {demoUsers.map((user) => (
                <button
                  className="rounded-md border bg-background px-3 py-2 text-left text-xs font-semibold transition-colors hover:border-primary hover:text-primary"
                  key={user.email}
                  type="button"
                  onClick={() => {
                    setEmail(user.email);
                    setPassword("password123");
                  }}
                >
                  {user.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden border-l bg-slate-950 p-6 text-white lg:block">
          <Card className="h-full border-white/10 bg-white/8 text-white shadow-none">
            <CardContent className="flex h-full flex-col justify-between p-8">
              <div>
                <Badge className="border-white/20 bg-white/10 text-white">Minimarket Sejahtera</Badge>
                <div className="mt-10 grid aspect-video place-items-center overflow-hidden rounded-lg border border-white/15 bg-slate-900">
                  <div className="grid gap-4 text-center">
                    <div className="mx-auto grid size-16 place-items-center rounded-md bg-primary">
                      <Heart className="size-8 fill-current" />
                    </div>
                    <p className="text-sm text-white/70"><span className="i18n-en">Family video ready to play</span><span className="i18n-zh">家庭视频可播放</span></p>
                  </div>
                </div>
              </div>
              <blockquote className="max-w-sm text-2xl font-bold leading-tight">
                <span className="i18n-en">Today’s memory returns with one simple scan.</span>
                <span className="i18n-zh">一次简单扫描，让今天的回忆再次出现。</span>
              </blockquote>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
