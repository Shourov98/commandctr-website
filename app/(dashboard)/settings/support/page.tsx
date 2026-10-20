"use client";

import { useState } from "react";
import { CloudUpload, MessageSquare, Minus, Paperclip, Search, SendHorizontal, X } from "lucide-react";

type ChatMessage = {
  id: string;
  sender: "agent" | "user";
  label: string;
  text: string;
};

type Ticket = {
  id: string;
  subject: string;
  status: "Resolved" | "Pending" | "Active";
  updatedAt: string;
};

const chatMessages: ChatMessage[] = [
  { id: "c1", sender: "agent", label: "Sarah • 10:02 AM", text: "Hi there! How can I help you with your order today?" },
  { id: "c2", sender: "user", label: "You • 10:03 AM", text: "I'm having trouble finding the invoice for last month." },
  { id: "c3", sender: "agent", label: "Sarah • 10:04 AM", text: "No problem, I can pull that up for you. One moment." },
];

const tickets: Ticket[] = [
  { id: "#1024", subject: "API Sync Error (Amazon)", status: "Resolved", updatedAt: "2h ago" },
  { id: "#1023", subject: "Unauthorized Transaction", status: "Pending", updatedAt: "5h ago" },
  { id: "#1022", subject: "Damaged Item", status: "Active", updatedAt: "Yesterday" },
];

const statusStyles: Record<Ticket["status"], string> = {
  Resolved: "bg-[#def8f0] text-[#46c7a7]",
  Pending: "bg-[#fff1d9] text-[#e4a43a]",
  Active: "bg-[#deebf8] text-[#4f9de8]",
};

export default function SettingsSupportPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="space-y-4">
        <header className="rounded-lg border border-[#283a61] bg-[#1b2748] px-4 py-5 text-white">
          <h1 className="text-xl font-semibold">Support Center</h1>
          <p className="mt-1 text-sm text-[#95a6c7]">How can we help you today?</p>
        </header>

        <article className="rounded-2xl border border-[#2b3d66] bg-[#1b2748] p-4 md:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#8ea0bf]" htmlFor="order-dispute">
                Related Order / Dispute ID (Optional)
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9eb0cd]" />
                <input
                  className="h-11 w-full rounded-xl border border-[#b6c5de] bg-[#f6f9ff] pl-10 pr-4 text-sm text-[#304264] outline-none placeholder:text-[#96a8c6]"
                  id="order-dispute"
                  placeholder="Search Order ID # or Dispute ID..."
                  type="text"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#8ea0bf]" htmlFor="ticket-subject">
                Subject
              </label>
              <input
                className="h-11 w-full rounded-xl border border-[#b6c5de] bg-[#f6f9ff] px-4 text-sm text-[#304264] outline-none placeholder:text-[#96a8c6]"
                id="ticket-subject"
                placeholder="Brief summary of the issue"
                type="text"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#8ea0bf]" htmlFor="ticket-description">
              Description
            </label>
            <div className="overflow-hidden rounded-xl border border-[#60739a] bg-white">
              <div className="flex h-9 items-center gap-3 border-b border-[#d7deea] bg-[#f5f8fd] px-3 text-xs font-semibold text-[#4f6488]">
                <button type="button">B</button>
                <button className="italic" type="button">I</button>
                <button type="button">U</button>
                <span>•</span>
                <button type="button">☰</button>
              </div>
              <textarea
                className="h-36 w-full resize-none px-4 py-3 text-sm text-[#324769] outline-none placeholder:text-[#9caecb]"
                id="ticket-description"
                placeholder="Please provide detailed information about the issue..."
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8ea0bf]">Attachments</p>
            <button
              className="flex h-36 w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#8da0c4] bg-[#f6f9ff] px-4 text-center"
              type="button"
            >
              <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#5d7cb5]">
                <CloudUpload className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-[#4a628a]">Click to upload or drag and drop</p>
              <p className="mt-1 text-xs text-[#95a8c8]">SVG, PNG, JPG or GIF (max. 800x400px)</p>
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#35d3ce] px-4 text-base font-semibold text-[#143b52] transition hover:brightness-95"
              type="button"
            >
              <span className="text-sm">⊕</span>
              Submit Ticket
            </button>
            <button
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-[#6f82aa] bg-transparent px-4 text-base font-semibold text-[#d0dcf2] transition hover:bg-white/5"
              onClick={() => setIsChatOpen(true)}
              type="button"
            >
              <MessageSquare className="h-4 w-4" />
              Live Chat
            </button>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-[#dbe2ef] bg-white shadow-[0_18px_38px_-34px_rgba(17,31,56,0.85)]">
          <table className="w-full text-left">
            <thead className="bg-[#273d6a] text-xs uppercase tracking-wide text-[#c9d5ec]">
              <tr>
                <th className="px-4 py-4 font-semibold">Ticket ID</th>
                <th className="px-4 py-4 font-semibold">Subject</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr className="border-t border-[#edf1f7]" key={ticket.id}>
                  <td className="px-4 py-4 text-sm font-semibold text-[#2b3b58]">{ticket.id}</td>
                  <td className="px-4 py-4 text-sm text-[#516383]">{ticket.subject}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex min-w-16 items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[ticket.status]}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-[#8fa1bf]">{ticket.updatedAt}</span>
                      <div className="flex items-center gap-2">
                        <button className="rounded-md border border-[#d9e1ef] bg-white px-3 py-1.5 text-xs font-semibold text-[#516383]" type="button">
                          View Details
                        </button>
                        <button className="rounded-md bg-[#35d3ce] px-3 py-1.5 text-xs font-semibold text-[#174359]" type="button">
                          Resolve
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>

      {isChatOpen ? (
        <div className="fixed bottom-5 right-5 z-50 w-[min(440px,calc(100vw-20px))] overflow-hidden rounded-t-xl rounded-b-md border border-[#22325a] bg-[#f3f4f6] shadow-[0_24px_70px_-26px_rgba(12,20,45,0.85)]">
          <header className="flex items-start justify-between bg-[#1a2545] px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#f0d6c0] to-[#c08757] text-lg font-semibold text-[#1a2545]">
                S
                <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#1a2545] bg-[#28cf6b]" />
              </div>
              <div>
                <p className="text-[34px] leading-none font-semibold">Chat with Sarah</p>
                <p className="mt-1 text-sm text-[#c4d2ee]">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-[#33d4d2] transition hover:text-white" type="button">
                <Minus className="h-5 w-5" />
              </button>
              <button className="text-[#33d4d2] transition hover:text-white" onClick={() => setIsChatOpen(false)} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="space-y-3 bg-[#f3f4f6] px-5 py-4">
            <p className="mx-auto inline-flex rounded-full bg-[#e9edf3] px-3 py-1 text-xs font-semibold text-[#a6b3c7]">Today</p>
            {chatMessages.map((message) =>
              message.sender === "agent" ? (
                <div className="max-w-[86%]" key={message.id}>
                  <p className="mb-1 text-sm text-[#90a0ba]">{message.label}</p>
                  <div className="rounded-[22px] rounded-tl-[12px] bg-[#e5e8ee] px-4 py-3 text-[17px] text-[#2f3d55]">{message.text}</div>
                </div>
              ) : (
                <div className="ml-auto max-w-[82%]" key={message.id}>
                  <p className="mb-1 text-right text-sm text-[#90a0ba]">{message.label}</p>
                  <div className="rounded-[22px] rounded-tr-[12px] bg-[#1d294b] px-4 py-3 text-[17px] text-white">{message.text}</div>
                </div>
              ),
            )}
            <div className="max-w-fit rounded-[22px] rounded-tl-[12px] bg-[#e5e8ee] px-5 py-3 text-[#8ea0bd]">•••</div>
          </div>

          <footer className="border-t border-[#e0e5ee] bg-[#f3f4f6] px-4 py-3">
            <div className="flex items-center gap-2">
              <button className="text-[#8ea0bd]" type="button">
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="flex h-11 flex-1 items-center rounded-2xl bg-[#e9edf3] px-4">
                <input
                  className="w-full bg-transparent text-sm text-[#2d3a53] outline-none placeholder:text-[#90a1bc]"
                  onChange={(event) => setDraftMessage(event.target.value)}
                  placeholder="Type a message..."
                  value={draftMessage}
                />
              </div>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1d294b] text-white shadow-[0_8px_18px_-8px_rgba(29,41,75,0.9)]"
                type="button"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-[#9babc4]">Powered by SupportFlow</p>
          </footer>
        </div>
      ) : null}
    </section>
  );
}
