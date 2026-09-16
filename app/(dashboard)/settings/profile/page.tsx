"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { 
  ArrowLeft, 
  Camera, 
  Check, 
  Copy, 
  Globe, 
  Loader2, 
  Mail, 
  Phone, 
  Shield, 
  User, 
  Building,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

export default function ProfileSettingsPage() {
  const { user } = useAuth();

  // Form States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+880 1712-345678");
  const [company, setCompany] = useState("Siyam Global Store");
  const [businessType, setBusinessType] = useState("E-commerce");
  const [timezone, setTimezone] = useState("Asia/Dhaka");
  
  // UI States
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync state from context when ready
  useEffect(() => {
    startTransition(() => {
      if (user) {
        setFirstName(user.firstName || "");
        setLastName(user.lastName || "");
        setEmail(user.email || "");
      } else {
        // Fallback defaults
        setFirstName("Siyam");
        setLastName("Ahmed");
        setEmail("siyam@example.com");
      }
    });
  }, [user]);

  const handleCopyId = () => {
    navigator.clipboard.writeText("CC-8947-SIYAM");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    setTimeout(() => {
      // Persist in localStorage to dynamically update headers/sidebars
      const raw = localStorage.getItem("commandctr-merchant-auth");
      if (raw) {
        try {
          const session = JSON.parse(raw);
          session.user = {
            ...session.user,
            firstName,
            lastName,
            email,
          };
          localStorage.setItem("commandctr-merchant-auth", JSON.stringify(session));
        } catch (err) {
          console.error("Failed to update local session", err);
        }
      }
      setIsSaving(false);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        // Force refresh to update navigation layouts with new session values
        window.location.reload();
      }, 1200);
    }, 800);
  };

  const initials = `${firstName?.[0] ?? "S"}${lastName?.[0] ?? "A"}`.toUpperCase();
  const displayName = `${firstName} ${lastName}`.trim() || "Siyam Ahmed";

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-white shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">Profile updated successfully! Refreshing...</span>
        </div>
      )}

      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Navigation Breadcrumb & Back Arrow */}
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dbe2ee] bg-white text-[#4b5b7a] hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#8d9db8] font-medium">
              <Link href="/settings" className="hover:text-[#32cbc6] transition">Settings</Link>
              <span>&gt;</span>
              <span className="text-[#4b5b7a]">My Profile</span>
            </div>
            <h1 className="text-lg font-bold text-[#1a2642]">Profile Settings</h1>
          </div>
        </div>

        {/* Premium Profile Banner Card */}
        <div className="overflow-hidden rounded-2xl border border-[#2c3b61] bg-[#111c35] text-white shadow-[0_20px_50px_-30px_rgba(22,35,70,0.4)]">
          <div className="h-28 bg-gradient-to-r from-[#111d38] via-[#1a3a5f] to-[#145a55] relative overflow-hidden">
            <div className="absolute top-0 right-0 bottom-0 left-0 bg-[radial-gradient(circle_at_70%_20%,rgba(10,208,225,0.15),transparent_60%)]" />
          </div>
          <div className="px-6 pb-6 relative flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              <div className="relative group shrink-0">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#111c35] bg-gradient-to-tr from-[#32cbc6] to-[#0ad0e1] text-3xl font-black text-white shadow-xl">
                  {initials}
                </div>
                <button 
                  type="button"
                  className="absolute bottom-0 right-0 bg-[#0ad0e1] text-[#111c35] rounded-full p-2 border-2 border-[#111c35] hover:bg-[#32cbc6] transition shadow-md cursor-pointer"
                  title="Upload profile photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-center sm:text-left pb-1">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold tracking-tight">{displayName}</h2>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                </div>
                <p className="text-sm text-[#8ea0c6] mt-0.5">{email}</p>
              </div>
            </div>

            <div className="flex justify-center md:justify-end gap-3 flex-wrap">
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-center">
                <p className="text-[10px] uppercase font-bold text-[#8ea0c6]/70 tracking-widest">Linked Channels</p>
                <p className="text-lg font-extrabold text-[#0ad0e1]">1 Active Storefront</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-center">
                <p className="text-[10px] uppercase font-bold text-[#8ea0c6]/70 tracking-widest">Platform Role</p>
                <p className="text-lg font-extrabold text-[#58eaef]">Merchant Admin</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Form Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <article className="rounded-2xl border border-[#dbe2ee] bg-white shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] overflow-hidden">
              <div className="border-b border-[#edf1f7] px-5 py-4">
                <h3 className="text-lg font-semibold text-[#232f46]">Account Information</h3>
                <p className="text-xs text-[#8d9db8] mt-0.5">Edit your name, primary email address, and phone number</p>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#8d9db8]">First Name</label>
                    <div className="flex h-11 items-center rounded-lg border border-[#edf1f7] bg-[#f6f8fc] px-3 transition-within focus-within:border-[#0ad0e1] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0ad0e1]/15">
                      <User className="h-4 w-4 text-[#a4b2c8] mr-2" />
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="w-full bg-transparent text-sm text-[#314157] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#8d9db8]">Last Name</label>
                    <div className="flex h-11 items-center rounded-lg border border-[#edf1f7] bg-[#f6f8fc] px-3 transition-within focus-within:border-[#0ad0e1] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0ad0e1]/15">
                      <User className="h-4 w-4 text-[#a4b2c8] mr-2" />
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="w-full bg-transparent text-sm text-[#314157] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#8d9db8]">Email Address</label>
                  <div className="flex h-11 items-center rounded-lg border border-[#edf1f7] bg-[#f6f8fc] px-3 transition-within focus-within:border-[#0ad0e1] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0ad0e1]/15">
                    <Mail className="h-4 w-4 text-[#a4b2c8] mr-2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john.doe@example.com"
                      className="w-full bg-transparent text-sm text-[#314157] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#8d9db8]">Phone Number</label>
                  <div className="flex h-11 items-center rounded-lg border border-[#edf1f7] bg-[#f6f8fc] px-3 transition-within focus-within:border-[#0ad0e1] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0ad0e1]/15">
                    <Phone className="h-4 w-4 text-[#a4b2c8] mr-2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 019-2834"
                      className="w-full bg-transparent text-sm text-[#314157] outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#edf1f7] flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#233a69] hover:bg-[#1f2e53] px-6 text-sm font-semibold text-white transition disabled:opacity-75 shadow-md cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      "Save Profile Details"
                    )}
                  </button>
                </div>
              </form>
            </article>

            {/* Merchant Workspace Info Panel */}
            <article className="rounded-2xl border border-[#dbe2ee] bg-white shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] overflow-hidden">
              <div className="border-b border-[#edf1f7] px-5 py-4">
                <h3 className="text-lg font-semibold text-[#232f46]">Workspace Configuration</h3>
                <p className="text-xs text-[#8d9db8] mt-0.5">Customize your company settings and timezone preferences</p>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#8d9db8]">Company / Store Name</label>
                    <div className="flex h-11 items-center rounded-lg border border-[#edf1f7] bg-[#f6f8fc] px-3 transition-within focus-within:border-[#0ad0e1] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0ad0e1]/15">
                      <Building className="h-4 w-4 text-[#a4b2c8] mr-2" />
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="My Online Store"
                        className="w-full bg-transparent text-sm text-[#314157] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#8d9db8]">Business Category</label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="h-11 w-full rounded-lg border border-[#edf1f7] bg-[#f6f8fc] px-3 text-sm text-[#314157] outline-none transition focus:border-[#0ad0e1] focus:bg-white focus:ring-2 focus:ring-[#0ad0e1]/15"
                    >
                      <option value="E-commerce">E-commerce Marketplace</option>
                      <option value="Drop shipping">Drop Shipping</option>
                      <option value="Wholesale">Wholesale / Distribution</option>
                      <option value="Retail">Retail Storefront</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#8d9db8]">Default Timezone</label>
                  <div className="flex h-11 items-center rounded-lg border border-[#edf1f7] bg-[#f6f8fc] px-3 transition-within focus-within:border-[#0ad0e1] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0ad0e1]/15">
                    <Globe className="h-4 w-4 text-[#a4b2c8] mr-2" />
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full bg-transparent text-sm text-[#314157] outline-none"
                    >
                      <option value="Asia/Dhaka">UTC+06:00 (Asia/Dhaka)</option>
                      <option value="America/New_York">UTC-05:00 (America/New_York)</option>
                      <option value="Europe/London">UTC+00:00 (Europe/London)</option>
                      <option value="Asia/Singapore">UTC+08:00 (Asia/Singapore)</option>
                    </select>
                  </div>
                </div>
              </div>
            </article>
          </div>

          {/* Right Status Column (1/3 width) */}
          <div className="space-y-6">
            {/* System Metadata Card */}
            <article className="rounded-2xl border border-[#dbe2ee] bg-white p-6 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
              <h3 className="text-base font-bold text-[#232f46] mb-4">System Metadata</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-[#9aa7bc] uppercase tracking-wider">Account Reference ID</p>
                  <div className="flex items-center justify-between gap-2 mt-1 rounded-lg bg-[#f6f8fc] border border-[#edf1f7] px-3 py-2">
                    <code className="text-xs font-mono font-bold text-[#314157]">CC-8947-SIYAM</code>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="text-[#a4b2c8] hover:text-[#0ad0e1] transition cursor-pointer"
                      title="Copy Reference ID"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500 animate-in zoom-in-75" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-[#edf1f7] pt-4">
                  <div>
                    <p className="text-[10px] font-bold text-[#9aa7bc] uppercase tracking-wider">Security Tier</p>
                    <p className="text-xs font-semibold text-[#44526d] mt-1 flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      Level 2 (High)
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-[#9aa7bc] uppercase tracking-wider">2FA Status</p>
                    <p className="text-xs font-semibold text-emerald-500 mt-1 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Configured
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#edf1f7] pt-4">
                  <p className="text-[10px] font-bold text-[#9aa7bc] uppercase tracking-wider">Workspace Created</p>
                  <p className="text-xs font-semibold text-[#44526d] mt-1">June 6, 2026 (18 hours ago)</p>
                </div>
              </div>
            </article>

            {/* Active Marketplaces Integration Status */}
            <article className="rounded-2xl border border-[#dbe2ee] bg-white p-6 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#232f46]">Integrations</h3>
                <span className="text-[10px] font-bold text-emerald-500 uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Synchronized</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0f1115] text-[10px] font-bold text-white">♪</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">TikTok Shop</p>
                      <p className="text-[10px] text-slate-400 font-medium">Auto-Sync Enabled</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#32cbc6]">$3,520.15</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ff9900] text-[10px] font-bold text-white">A</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Amazon US</p>
                      <p className="text-[10px] text-slate-400 font-medium">Auto-Sync Enabled</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#32cbc6]">$6,830.22</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0064d2] text-[10px] font-bold text-white">E</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">eBay Global</p>
                      {/* Restore this live status when eBay goes live again. */}
                      {/* <p className="text-[10px] text-slate-400 font-medium">Auto-Sync Enabled</p> */}
                      <p className="text-[10px] text-slate-400 font-medium">Coming Soon</p>
                    </div>
                  </div>
                  {/* Restore live eBay balance when eBay goes live again. */}
                  {/* <span className="text-xs font-bold text-[#32cbc6]">$2,100.43</span> */}
                  <span className="text-xs font-bold text-[#8ea0bf]">$0.00</span>
                </div>
              </div>
            </article>
          </div>

        </div>
      </div>
    </section>
  );
}
