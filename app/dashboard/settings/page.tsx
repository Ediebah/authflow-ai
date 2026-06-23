"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastContext";
import { SignOutButton } from "@/components/SignOutButton";

interface Profile {
  name: string;
  title: string;
  practice_name: string;
  address: string;
  phone: string;
  email: string;
}

const EMPTY: Profile = {
  name: "",
  title: "",
  practice_name: "",
  address: "",
  phone: "",
  email: "",
};

export default function SettingsPage() {
  const [form, setForm] = useState<Profile>(EMPTY);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserEmail(user.email ?? "");
        const { data } = await supabase
          .from("profiles")
          .select("name, title, practice_name, address, phone, email")
          .eq("id", user.id)
          .single();
        if (data) setForm(data as Profile);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { showToast("Not logged in.", "error"); return; }

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        ...form,
        updated_at: new Date().toISOString(),
      });

      if (error) showToast("Failed to save. Please try again.", "error");
      else showToast("Profile saved.");
    } catch {
      showToast("Failed to save. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="max-w-xl"><p className="text-sm text-slate-400">Loading…</p></div>;

  return (
    <div className="max-w-xl space-y-10">
      {/* Profile form */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-sm text-slate-500 mb-8">
          Your practice details appear automatically in generated letters.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-5">
            <Field label="Full Name">
              <input name="name" value={form.name} onChange={handleChange} className={inputCls} placeholder="Dr. Jane Smith" />
            </Field>
            <Field label="Title / Credentials">
              <input name="title" value={form.title} onChange={handleChange} className={inputCls} placeholder="MD, Internal Medicine" />
            </Field>
          </div>
          <Field label="Practice Name">
            <input name="practice_name" value={form.practice_name} onChange={handleChange} className={inputCls} placeholder="Downtown Medical Group" />
          </Field>
          <Field label="Address">
            <input name="address" value={form.address} onChange={handleChange} className={inputCls} placeholder="123 Main St, Boston MA 02101" />
          </Field>
          <div className="grid grid-cols-2 gap-5">
            <Field label="Phone">
              <input name="phone" value={form.phone} onChange={handleChange} className={inputCls} placeholder="(617) 555-0100" />
            </Field>
            <Field label="Contact Email">
              <input name="email" value={form.email} onChange={handleChange} className={inputCls} placeholder="drsmith@clinic.com" />
            </Field>
          </div>
          <button type="submit" disabled={saving} className="self-start bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50 text-sm">
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </form>
      </div>

      {/* Account section */}
      <div className="border-t border-white/8 pt-8">
        <h2 className="text-base font-semibold text-white mb-4">Account</h2>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-300">Signed in as</p>
            <p className="text-xs text-slate-500 mt-0.5">{userEmail}</p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "bg-[#0B1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500/50 transition-colors";
