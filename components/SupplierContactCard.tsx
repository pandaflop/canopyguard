"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useCaseStore } from "@/lib/case-store";
import { formatDate } from "@/lib/utils";
import { Mail, Map } from "lucide-react";

export function SupplierContactCard({
  supplierId,
  supplierName,
  contactName,
  contactEmail,
  onboardedAt,
}: {
  supplierId: string;
  supplierName: string;
  contactName: string;
  contactEmail: string;
  onboardedAt: string;
}) {
  const { toast } = useCaseStore();
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState(`Boundary follow-up · ${supplierName}`);
  const [body, setBody] = useState(
    `Hi ${contactName.split(" ")[0]},\n\nWe ran our most recent satellite review of your monitored area. Could you confirm any recent harvesting or replanting activity in the last 90 days?\n\nThanks,\nSustainability & Compliance team`,
  );

  function send() {
    setComposeOpen(false);
    toast(`Message to ${contactName} queued for delivery`);
  }

  function requestBoundary() {
    toast(`Boundary update request sent to ${contactName}`);
  }

  return (
    <Card>
      <CardHeader title="Supplier contact" />
      <div className="space-y-1 text-sm">
        <p className="font-medium text-ink-900">{contactName}</p>
        <p className="font-mono text-xs text-ink-600">{contactEmail}</p>
        <p className="text-[11px] text-ink-500">Onboarded {formatDate(onboardedAt)}</p>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setComposeOpen((v) => !v)}>
          <Mail className="h-3.5 w-3.5" /> {composeOpen ? "Cancel" : "Send message"}
        </Button>
        <Button size="sm" variant="outline" onClick={requestBoundary}>
          <Map className="h-3.5 w-3.5" /> Request boundary update
        </Button>
      </div>

      {composeOpen && (
        <div className="mt-3 rounded-md border border-ink-200 bg-ink-50/60 p-3">
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">To</span>
            <p className="mt-0.5 text-xs text-ink-700">{contactName} &lt;{contactEmail}&gt;</p>
          </label>
          <label className="mt-2 block">
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 h-8 w-full rounded-md border border-ink-200 bg-white px-2 text-xs"
            />
          </label>
          <label className="mt-2 block">
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">Message</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1 min-h-[100px] w-full rounded-md border border-ink-200 bg-white p-2 text-xs"
            />
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={send} disabled={!subject.trim() || !body.trim()}>
              Send
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
