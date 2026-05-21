type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

interface Env {
	ONESIGNAL_REST_API_KEY?: string;
}

declare namespace App {
	interface Locals extends Runtime {
		session: import("better-auth").Session | null;
		user: import("better-auth").User | null;
		currentAccount: import("@/lib/auth").CurrentAccount | null;
	}
}
