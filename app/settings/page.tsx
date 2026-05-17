import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TEAM_MEMBERS, CURRENT_USER } from "@/lib/mock-data";
import { RISK_WEIGHTS } from "@/lib/risk-scoring";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-canopy-700">Settings</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">Workspace settings</h1>
        <p className="mt-1 text-sm text-ink-500">
          Configure detection thresholds, risk model weights, integrations, and team access.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Risk model weights"
            subtitle="Maximum points each signal contributes to the composite supplier risk score"
            action={<Badge tone="canopy">Active model · cg-risk-1.0</Badge>}
          />
          <ul className="divide-y divide-ink-100">
            {Object.entries(RISK_WEIGHTS).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between py-2">
                <span className="text-sm text-ink-900">{k.replace(/_/g, " ")}</span>
                <span className="font-mono text-sm text-ink-700">{v}</span>
              </li>
            ))}
            <li className="flex items-center justify-between border-t-2 border-ink-200 py-2 pt-3">
              <span className="text-sm font-semibold text-ink-900">Total</span>
              <span className="font-mono text-sm font-semibold text-ink-900">
                {Object.values(RISK_WEIGHTS).reduce((s, v) => s + v, 0)}
              </span>
            </li>
          </ul>
          <p className="mt-3 text-[11px] leading-snug text-ink-500">
            Changing weights creates a new model version. Existing scores remain attached to the model version that
            generated them so historical evidence stays auditable.
          </p>
        </Card>

        <Card>
          <CardHeader title="Detection thresholds" subtitle="Tune the conditions that trigger an alert" />
          <ul className="space-y-3 text-sm">
            <Threshold label="NDVI anomaly significance threshold" value="-15% vs same-season baseline" />
            <Threshold label="SAR backscatter delta — weak / moderate / strong" value="+1 / +2 / +3 dB" />
            <Threshold label="Persistent bare-soil threshold" value="3 consecutive months below NDVI 0.25" />
            <Threshold label="Post-2020 forest loss escalation" value="≥ 2% of boundary area" />
            <Threshold label="External alert source weighting" value="RADD 1.0 · GLAD-S2 0.9 · GFW 0.8" />
          </ul>
        </Card>

        <Card>
          <CardHeader title="Satellite data sources" subtitle="Connected and available providers" />
          <ul className="space-y-2 text-sm">
            <Source name="Sentinel-2 SR (NDVI)" status="connected" detail="ESA Copernicus · via Google Earth Engine" />
            <Source name="Sentinel-1 GRD (SAR)" status="connected" detail="ESA Copernicus · via Google Earth Engine" />
            <Source name="Hansen Global Forest Change" status="connected" detail="University of Maryland v1.10" />
            <Source name="WDPA Protected Areas" status="connected" detail="UNEP-WCMC monthly snapshot" />
            <Source name="RADD alerts" status="connected" detail="Wageningen University" />
            <Source name="GLAD-S2 alerts" status="available" detail="UMD Global Land Analysis" />
            <Source name="GFW Integrated alerts" status="available" detail="Global Forest Watch" />
          </ul>
        </Card>

        <Card>
          <CardHeader title="Team &amp; access" subtitle="Members with access to this workspace" />
          <ul className="divide-y divide-ink-100">
            {TEAM_MEMBERS.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-200 text-xs font-semibold text-ink-700">
                    {u.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-900">
                      {u.name}{u.id === CURRENT_USER.id && " (you)"}
                    </p>
                    <p className="text-[11px] text-ink-500">{u.email}</p>
                  </div>
                </div>
                <Badge tone="muted">{u.role.replace(/_/g, " ")}</Badge>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="secondary" className="mt-3">Invite teammate</Button>
        </Card>

        <Card>
          <CardHeader title="Integrations" subtitle="Outbound destinations for evidence reports and alerts" />
          <ul className="space-y-2 text-sm">
            <Source name="Slack #supply-chain-alerts" status="connected" detail="Critical + high alerts" />
            <Source name="ServiceNow audit cases" status="connected" detail="Investigate + escalate cases" />
            <Source name="SAP Ariba supplier records" status="available" detail="Auto-attach risk score to supplier card" />
            <Source name="Salesforce Sustainability Cloud" status="available" detail="Push compliance posture KPIs" />
          </ul>
        </Card>

        <Card>
          <CardHeader title="Disclaimer language" subtitle="Used in every PDF report and exported evidence bundle" />
          <textarea
            className="min-h-[120px] w-full resize-y rounded-md border border-ink-200 bg-ink-50 p-3 text-xs text-ink-900"
            defaultValue="This is a satellite-based due diligence evidence report. It provides risk indicators only and does not constitute a legal certification of land-use status. Findings are based on available public satellite data and the supplier-provided boundary."
          />
        </Card>
      </div>
    </div>
  );
}

function Threshold({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-dashed border-ink-100 pb-2">
      <span className="text-ink-700">{label}</span>
      <span className="font-mono text-xs text-ink-900">{value}</span>
    </li>
  );
}

function Source({ name, status, detail }: { name: string; status: "connected" | "available"; detail: string }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-dashed border-ink-100 pb-2 last:border-b-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm text-ink-900">{name}</p>
        <p className="text-[11px] text-ink-500">{detail}</p>
      </div>
      <Badge tone={status === "connected" ? "low" : "muted"} dot>{status}</Badge>
    </li>
  );
}
