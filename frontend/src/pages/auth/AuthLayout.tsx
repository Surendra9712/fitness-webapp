import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { LoginForm } from "./Login";
import { RegisterForm } from "./Register";
import AuthShell from "./AuthShell";

// ── Page ──────────────────────────────────────────────────────────────────────

const headings = {
  login: { title: "Welcome back", sub: "Sign in to your account to continue" },
  register: {
    title: "Create account",
    sub: "Join SmartDiet Pro and start your fitness journey",
  },
};

export default function AuthLayout() {
  const [searchParams] = useSearchParams();
  const initialTab =
    searchParams.get("tab") === "register" ? "register" : "login";
  const [tab, setTab] = useState<"login" | "register">(initialTab);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "register" || t === "login") setTab(t);
  }, [searchParams]);

  return (
    <AuthShell>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "login" | "register")}
      >
        {/* Tab switcher at the top */}
        <TabsList className="mb-8 w-[240px]">
          <TabsTrigger value="login" className="flex-1">
            Sign In
          </TabsTrigger>
          <TabsTrigger value="register" className="flex-1">
            Register
          </TabsTrigger>
        </TabsList>

        {/* Heading — updates with active tab */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            {headings[tab].title}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {headings[tab].sub}
          </p>
        </div>

        <TabsContent value="login">
          <LoginForm />
        </TabsContent>

        <TabsContent value="register">
          <RegisterForm />
        </TabsContent>
      </Tabs>
    </AuthShell>
  );
}
