"use client";

import AuthRedirect from "@/components/auth/AuthRedirect";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiClientError } from "@/lib/auth";
import Link from "next/link";
import { FormEvent, useState } from "react";
import AuthShell from "../../components/auth/AuthShell";
import { Eye, EyeOff } from "lucide-react";

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const INTEGRATION_TOUR_ENABLED_KEY = "integration-shepherd-enabled";
const INTEGRATION_TOUR_STAGE_KEY = "integration-shepherd-stage";
const INTEGRATION_TOUR_COMPLETED_KEY = "integration-shepherd-completed";

export default function SignupPage() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Fill in all fields to create your account.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!passwordRule.test(password)) {
      setError("Password must include uppercase, lowercase, number, special character, and be at least 8 characters.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });
      if (window.localStorage.getItem(INTEGRATION_TOUR_COMPLETED_KEY) !== "1") {
        window.sessionStorage.setItem(INTEGRATION_TOUR_ENABLED_KEY, "1");
        window.sessionStorage.setItem(INTEGRATION_TOUR_STAGE_KEY, "1");
      } else {
        window.sessionStorage.removeItem(INTEGRATION_TOUR_ENABLED_KEY);
        window.sessionStorage.removeItem(INTEGRATION_TOUR_STAGE_KEY);
      }
      window.location.replace("/dashboard");
    } catch (submissionError) {
      setError(submissionError instanceof ApiClientError ? submissionError.message : "Unable to create your account right now.");
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
        Create your account
      </h1>
      <p className="mt-3 text-lg text-[#8b95a7] sm:text-xl">
        Join the elite network of multichannel retailers.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold tracking-[0.08em] text-[#8b93a2] sm:text-sm">
              FIRST NAME
            </label>
            <input
              type="text"
              name="firstName"
              autoComplete="given-name"
              autoFocus
              placeholder="Jane"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="mt-2 h-14 w-full border border-[#e3e7ed] bg-[#eef1f5] px-4 text-lg text-[#4a556a] placeholder:text-[#b4bcc8] transition focus:border-[#32cbc6] focus:outline-none focus:ring-2 focus:ring-[#32cbc6]/25 sm:h-16 sm:text-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold tracking-[0.08em] text-[#8b93a2] sm:text-sm">
              LAST NAME
            </label>
            <input
              type="text"
              name="lastName"
              autoComplete="family-name"
              placeholder="Doe"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="mt-2 h-14 w-full border border-[#e3e7ed] bg-[#eef1f5] px-4 text-lg text-[#4a556a] placeholder:text-[#b4bcc8] transition focus:border-[#32cbc6] focus:outline-none focus:ring-2 focus:ring-[#32cbc6]/25 sm:h-16 sm:text-xl"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold tracking-[0.08em] text-[#8b93a2] sm:text-sm">
            EMAIL ADDRESS
          </label>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-14 w-full border border-[#e3e7ed] bg-[#eef1f5] px-4 text-lg text-[#4a556a] placeholder:text-[#b4bcc8] transition focus:border-[#32cbc6] focus:outline-none focus:ring-2 focus:ring-[#32cbc6]/25 sm:h-16 sm:text-xl"
          />
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
            autoComplete="new-password"
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

        <div>
          <label className="text-xs font-semibold tracking-[0.08em] text-[#8b93a2] sm:text-sm">
            CONFIRM PASSWORD
          </label>
        <div className="relative mt-2">
          <input
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="•••••••••"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="h-14 w-full border border-[#e3e7ed] bg-[#eef1f5] pl-4 pr-12 text-lg text-[#4a556a] placeholder:text-[#b4bcc8] transition focus:border-[#32cbc6] focus:outline-none focus:ring-2 focus:ring-[#32cbc6]/25 sm:h-16 sm:text-xl"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b4bcc8] hover:text-[#32cbc6] transition focus:outline-none cursor-pointer"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? (
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

        <p className="text-sm text-[#8b95a7] sm:text-base">
          Use at least 8 characters with uppercase, lowercase, number, and special character. Example: <span className="font-semibold text-[#4a556a]">Password@123</span>
        </p>

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
          {isSubmitting ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[#97a0af] sm:text-base">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#32cbc6]">
          Sign in
        </Link>
      </p>
      </AuthShell>
    </AuthRedirect>
  );
}
