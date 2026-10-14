"use client";

import { Facebook, Mail, Eye, EyeOff } from "lucide-react";
import AuthRedirect from "@/components/auth/AuthRedirect";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiClientError } from "@/lib/auth";
import Link from "next/link";
import { FormEvent, useState } from "react";
import AuthShell from "../../components/auth/AuthShell";

const socialButtons = [
  { label: "Google", icon: "G" },
  { label: "Facebook", icon: "f", lucide: true },
  { label: "Tiktok", icon: "♪" },
];

const INTEGRATION_TOUR_ENABLED_KEY = "integration-shepherd-enabled";
const INTEGRATION_TOUR_STAGE_KEY = "integration-shepherd-stage";
const INTEGRATION_TOUR_COMPLETED_KEY = "integration-shepherd-completed";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Enter both email and password to continue.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      if (window.localStorage.getItem(INTEGRATION_TOUR_COMPLETED_KEY) !== "1") {
        window.sessionStorage.setItem(INTEGRATION_TOUR_ENABLED_KEY, "1");
        window.sessionStorage.setItem(INTEGRATION_TOUR_STAGE_KEY, "1");
      } else {
        window.sessionStorage.removeItem(INTEGRATION_TOUR_ENABLED_KEY);
        window.sessionStorage.removeItem(INTEGRATION_TOUR_STAGE_KEY);
      }
      window.location.replace("/dashboard");
    } catch (submissionError) {
      setError(submissionError instanceof ApiClientError ? submissionError.message : "Unable to log in right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthRedirect>
      <AuthShell>
      <Link href="/" className="text-3xl font-bold text-[#33cac7] sm:text-4xl">
        Twinstr
      </Link>

      <h1 className="mt-10 text-4xl font-medium tracking-[-0.02em] text-[#303a4f] sm:text-5xl">
        Log in to your Account
      </h1>
      <p className="mt-3 text-lg text-[#8b95a7] sm:text-xl">
        Welcome back! Select method to log in:
      </p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {socialButtons.map((item) => (
          <button
            key={item.label}
            type="button"
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#d5dae3] bg-[#eef1f5] text-base font-medium text-[#4a556a] transition hover:bg-[#e3e8ef] sm:h-14 sm:text-lg"
          >
            {item.lucide ? (
              <Facebook className="h-5 w-5" />
            ) : (
              <span className="text-lg">{item.icon}</span>
            )}
            {item.label}
          </button>
        ))}
      </div>

      <div className="my-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-[#d9dee6]" />
        <span className="text-xs font-semibold tracking-[0.08em] text-[#afb6c2] sm:text-sm">
          OR CONTINUE WITH EMAIL
        </span>
        <div className="h-px flex-1 bg-[#d9dee6]" />
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="text-xs font-semibold tracking-[0.08em] text-[#8b93a2] sm:text-sm">
            EMAIL ADDRESS
          </label>
          <div className="mt-2 flex h-14 items-center border border-[#e3e7ed] bg-[#eef1f5] px-4 transition focus-within:border-[#32cbc6] focus-within:ring-2 focus-within:ring-[#32cbc6]/25 sm:h-16">
            <Mail className="mr-2 h-5 w-5 text-[#b4bcc8]" />
            <input
              type="email"
              name="email"
              autoComplete="email"
              autoFocus
              placeholder="jane@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-transparent text-lg text-[#4a556a] placeholder:text-[#b4bcc8] focus:outline-none sm:text-xl"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold tracking-[0.08em] text-[#8b93a2] sm:text-sm">
              PASSWORD
            </label>
            <span className="text-xs font-semibold text-[#34c7c3] sm:text-sm">
              STRONG
            </span>
          </div>
        <div className="relative mt-2">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            placeholder="•••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-14 w-full border border-[#e3e7ed] bg-[#eef1f5] pl-4 pr-12 text-lg text-[#4a556a] placeholder:text-[#b4bcc8] transition focus:border-[#32cbc6] focus:outline-none focus:ring-2 focus:ring-[#32cbc6]/25 sm:h-16 sm:text-xl"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b4bcc8] hover:text-[#32cbc6] transition focus:outline-none cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

        {error ? (
          <p className="text-sm font-medium text-[#d54d6b] sm:text-base">{error}</p>
        ) : null}

        <div className="mt-2 flex items-center justify-between text-sm sm:text-base">
          <label className="flex items-center gap-2 text-[#98a1b0]">
            <input type="checkbox" className="h-4 w-4 rounded border-[#ccd3de]" />
            Remember me
          </label>
          <Link href="#" className="font-medium text-[#32cbc6]">
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 h-14 w-full rounded-xl bg-[#263f72] text-lg font-semibold text-white shadow-[0_7px_16px_rgba(24,39,70,0.25)] transition hover:bg-[#2d497f] sm:h-16 sm:text-xl"
        >
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[#97a0af] sm:text-base">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-[#32cbc6]">
          Create an account
        </Link>
      </p>
      </AuthShell>
    </AuthRedirect>
  );
}
