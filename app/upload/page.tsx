"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BoundaryMap } from "@/components/maps/BoundaryMap";
import {
  polygonAreaHectares,
  polygonCentroid,
  validateBoundary,
} from "@/lib/boundary-validation";
import { parseGeoJson } from "@/lib/geojson-parse";
import { useCaseStore } from "@/lib/case-store";
import { createSupplierBundle } from "@/lib/mock-data";
import type { SimplePolygon, SupplierBoundary } from "@/lib/types";
import { COMMODITY_LABELS } from "@/lib/types";
import {
  Upload,
  MousePointer2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  ClipboardPaste,
  FileJson,
} from "lucide-react";

type InputMode = "demo" | "file" | "paste" | "draw";

interface PolygonSource {
  polygon: SimplePolygon | null;
  source: SupplierBoundary["source"];
  overlapsProtected: boolean;
  label: string;
  description: string;
}

const DEMO_INPUTS: PolygonSource[] = [
  {
    label: "Well-formed GeoJSON",
    description: "Clean 1,200 ha palm plantation polygon, 12 vertices, no overlap.",
    source: "uploaded_geojson",
    overlapsProtected: false,
    polygon: {
      type: "Polygon",
      coordinates: [[
        [101.42, 0.42],
        [101.46, 0.41],
        [101.49, 0.44],
        [101.5, 0.48],
        [101.48, 0.52],
        [101.45, 0.53],
        [101.41, 0.52],
        [101.39, 0.49],
        [101.4, 0.45],
        [101.42, 0.42],
      ]],
    },
  },
  {
    label: "GPS-point-only submission",
    description: "Supplier provided a single GPS coordinate; system auto-buffered a small polygon.",
    source: "gps_point_buffered",
    overlapsProtected: false,
    polygon: {
      type: "Polygon",
      coordinates: [[
        [-6.6, 5.79],
        [-6.598, 5.79],
        [-6.598, 5.792],
        [-6.6, 5.792],
        [-6.6, 5.79],
      ]],
    },
  },
  {
    label: "Polygon overlapping protected area",
    description: "Hand-drawn boundary that intersects a designated forest reserve.",
    source: "drawn",
    overlapsProtected: true,
    polygon: {
      type: "Polygon",
      coordinates: [[
        [113.85, 2.28],
        [113.95, 2.27],
        [113.98, 2.34],
        [113.92, 2.4],
        [113.84, 2.36],
        [113.85, 2.28],
      ]],
    },
  },
  {
    label: "No polygon submitted",
    description: "Supplier sent a CSV with no geometry.",
    source: "uploaded_geojson",
    overlapsProtected: false,
    polygon: null,
  },
];

const EXAMPLE_PASTE = `{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [101.42, 0.42], [101.46, 0.41], [101.49, 0.44],
      [101.50, 0.48], [101.48, 0.52], [101.45, 0.53],
      [101.41, 0.52], [101.39, 0.49], [101.40, 0.45],
      [101.42, 0.42]
    ]]
  },
  "properties": { "name": "Demo plot" }
}`;

export default function UploadPage() {
  const { toast, addSupplier } = useCaseStore();
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>("demo");
  const [demoIdx, setDemoIdx] = useState(0);
  const [userPolygon, setUserPolygon] = useState<SimplePolygon | null>(null);
  const [userSource, setUserSource] = useState<SupplierBoundary["source"]>("uploaded_geojson");
  const [userFileName, setUserFileName] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState(EXAMPLE_PASTE);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [overlapsProtected, setOverlapsProtected] = useState(false);

  const [supplierName, setSupplierName] = useState("New supplier");
  const [commodity, setCommodity] = useState<keyof typeof COMMODITY_LABELS>("palm_oil");
  const [country, setCountry] = useState("IDN");
  const [exposurePct, setExposurePct] = useState(3.5);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolve the active polygon source based on mode.
  const activeSource: PolygonSource = useMemo(() => {
    if (mode === "demo") return DEMO_INPUTS[demoIdx];
    if (mode === "draw") {
      return {
        polygon: null,
        source: "drawn",
        overlapsProtected: false,
        label: "Draw on map",
        description: "Click on the satellite map to add vertices, double-click to close. Drawing UI is a planned upgrade — for now, upload a file or paste GeoJSON.",
      };
    }
    return {
      polygon: userPolygon,
      source: userSource,
      overlapsProtected,
      label: mode === "file" ? userFileName ?? "Uploaded file" : "Pasted GeoJSON",
      description:
        mode === "file"
          ? "Geometry parsed from the uploaded file."
          : "Geometry parsed from the textarea contents.",
    };
  }, [mode, demoIdx, userPolygon, userSource, userFileName, pasteText, overlapsProtected]);

  const validation = useMemo(
    () =>
      validateBoundary({
        polygon: activeSource.polygon,
        source: activeSource.source,
        overlapsProtectedArea: activeSource.overlapsProtected,
      }),
    [activeSource],
  );

  const previewBoundary: SupplierBoundary | null = activeSource.polygon
    ? {
        id: "BND-DRAFT",
        supplierId: "DRAFT",
        polygon: activeSource.polygon,
        areaHectares: polygonAreaHectares(activeSource.polygon),
        source: activeSource.source,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "you",
        quality: validation.quality,
        qualityScore: validation.qualityScore,
        validationIssues: validation.issues,
        protectedAreaOverlapHectares: activeSource.overlapsProtected
          ? Math.round(polygonAreaHectares(activeSource.polygon) * 0.18)
          : 0,
        centroid: polygonCentroid(activeSource.polygon),
      }
    : null;

  function applyParseResult(polygon: SimplePolygon | null, warnings: string[], errors: string[]) {
    setUserPolygon(polygon);
    setParseWarnings(warnings);
    setParseErrors(errors);
    if (polygon) toast("Boundary parsed successfully");
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUserFileName(file.name);
    setUserSource("uploaded_geojson");
    setMode("file");
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      if (/\.kml$/i.test(file.name)) {
        applyParseResult(null, [], ["KML parsing is on the roadmap. Export your polygon as GeoJSON for now (most GIS tools support this directly)."]);
        return;
      }
      if (/\.(zip|shp)$/i.test(file.name)) {
        applyParseResult(null, [], ["Shapefile parsing is on the roadmap. Convert your shapefile to GeoJSON (e.g. with `ogr2ogr -f GeoJSON`) and re-upload."]);
        return;
      }
      const result = parseGeoJson(text);
      applyParseResult(result.polygon, result.warnings, result.errors);
    };
    reader.onerror = () =>
      applyParseResult(null, [], [`Could not read file: ${reader.error?.message ?? "unknown error"}`]);
    reader.readAsText(file);
    // Allow re-uploading the same file later.
    e.target.value = "";
  }

  function onParsePaste() {
    setUserSource("uploaded_geojson");
    setMode("paste");
    const result = parseGeoJson(pasteText);
    applyParseResult(result.polygon, result.warnings, result.errors);
  }

  function onSubmit() {
    if (!activeSource.polygon) {
      toast("Provide a polygon before onboarding.");
      return;
    }
    if (validation.quality === "needs_review") {
      toast("Resolve validation errors before onboarding.");
      return;
    }
    setSubmitting(true);
    // Run the same pipeline as the seed loader: validate → satellite →
    // risk → alerts → audit case. The new bundle lands in the session
    // store and ripples through every consumer that reads it.
    try {
      const bundle = createSupplierBundle({
        name: supplierName.trim() || "New supplier",
        commodity,
        countryIso3: country,
        polygon: activeSource.polygon,
        boundarySource: activeSource.source,
        overlapsProtectedArea: activeSource.overlapsProtected,
        procurementExposurePct: exposurePct,
        // Derive a plausible volume/spend so analytics charts move when added.
        procurementVolumeTonnesPerYear: Math.round(exposurePct * 2_500),
        procurementSpendUsd: Math.round(exposurePct * 2_000_000),
        documentationStatus: "partial",
        certification: "Pending",
      });
      addSupplier(bundle);
      router.push(`/suppliers/${bundle.supplier.id}`);
    } catch (err) {
      toast(`Onboarding failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-canopy-700">Boundary onboarding</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
          Upload &amp; validate supplier boundary
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Upload a GeoJSON / KML / Shapefile, or paste raw GeoJSON. CanopyGuard validates geometry, checks for
          protected-area overlap, and assigns a boundary quality score before satellite monitoring begins.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Supplier metadata" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Supplier name">
                <input
                  className="h-9 w-full rounded-md border border-ink-200 bg-white px-2 text-sm"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                />
              </Field>
              <Field label="Country (ISO3)">
                <input
                  className="h-9 w-full rounded-md border border-ink-200 bg-white px-2 font-mono text-sm uppercase"
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 3))}
                  maxLength={3}
                />
              </Field>
              <Field label="Commodity">
                <select
                  className="h-9 w-full rounded-md border border-ink-200 bg-white px-2 text-sm"
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value as any)}
                >
                  {Object.entries(COMMODITY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Procurement exposure (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={exposurePct}
                  onChange={(e) => setExposurePct(parseFloat(e.target.value) || 0)}
                  className="h-9 w-full rounded-md border border-ink-200 bg-white px-2 text-sm"
                />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Provide boundary geometry"
              subtitle="Choose how to supply the polygon. Demo inputs let you preview validation against canned scenarios."
            />
            <div className="grid grid-cols-4 gap-2">
              <ModeTile
                icon={FileJson}
                label="Demo inputs"
                hint="Canned scenarios"
                active={mode === "demo"}
                onClick={() => setMode("demo")}
              />
              <ModeTile
                icon={Upload}
                label="Upload file"
                hint=".geojson, .json"
                active={mode === "file"}
                onClick={() => {
                  setMode("file");
                  fileInputRef.current?.click();
                }}
              />
              <ModeTile
                icon={ClipboardPaste}
                label="Paste GeoJSON"
                hint="Raw polygon coords"
                active={mode === "paste"}
                onClick={() => setMode("paste")}
              />
              <ModeTile
                icon={MousePointer2}
                label="Draw on map"
                hint="Coming soon"
                active={mode === "draw"}
                onClick={() => setMode("draw")}
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json,.kml,.zip,application/geo+json,application/json"
              className="hidden"
              onChange={onFileChange}
            />

            {mode === "demo" && (
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-500">
                  Demo input
                </p>
                <div className="flex flex-wrap gap-2">
                  {DEMO_INPUTS.map((d, i) => (
                    <button
                      key={d.label}
                      onClick={() => setDemoIdx(i)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                        demoIdx === i
                          ? "border-canopy-300 bg-canopy-50 text-canopy-800"
                          : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-ink-500">{DEMO_INPUTS[demoIdx].description}</p>
              </div>
            )}

            {mode === "file" && (
              <div className="mt-4 rounded-md border border-dashed border-ink-300 bg-ink-50/60 p-4">
                <p className="text-xs text-ink-700">
                  {userFileName ? (
                    <>
                      Loaded <span className="font-mono">{userFileName}</span> —{" "}
                      {userPolygon ? "polygon parsed successfully." : "see validation errors below."}
                    </>
                  ) : (
                    <>Pick a .geojson or .json file. KML and Shapefile will route to the conversion notice.</>
                  )}
                </p>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" /> {userFileName ? "Replace file" : "Choose file"}
                </Button>
              </div>
            )}

            {mode === "paste" && (
              <div className="mt-4 space-y-2">
                <label className="block">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">
                    GeoJSON
                  </span>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    spellCheck={false}
                    className="mt-1 min-h-[180px] w-full resize-y rounded-md border border-ink-200 bg-ink-50 p-3 font-mono text-[11px] leading-snug text-ink-900 focus:border-canopy-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-canopy-500/15"
                  />
                </label>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-ink-500">
                    Accepts FeatureCollection, Feature, Polygon, or MultiPolygon.
                  </p>
                  <Button size="sm" variant="primary" onClick={onParsePaste}>
                    Parse &amp; validate
                  </Button>
                </div>
              </div>
            )}

            {mode === "draw" && (
              <div className="mt-4 rounded-md border border-dashed border-ink-300 bg-ink-50/60 p-4 text-xs text-ink-600">
                Drawing UI is on the roadmap. For the MVP, upload a GeoJSON or paste polygon coordinates — both feed
                the same validation pipeline as a hand-drawn boundary would.
              </div>
            )}

            {(mode === "file" || mode === "paste") && (
              <label className="mt-4 flex items-center gap-2 text-xs text-ink-700">
                <input
                  type="checkbox"
                  checked={overlapsProtected}
                  onChange={(e) => setOverlapsProtected(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Simulate overlap with a protected / HCV area (for testing the validation path)
              </label>
            )}

            {(parseWarnings.length > 0 || parseErrors.length > 0) && (
              <div className="mt-3 space-y-1.5">
                {parseErrors.map((e, i) => (
                  <p key={`err-${i}`} className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-800">
                    {e}
                  </p>
                ))}
                {parseWarnings.map((w, i) => (
                  <p key={`warn-${i}`} className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
                    {w}
                  </p>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Validation results"
              subtitle="Run before monitoring begins; surfaces issues that would distort the satellite signal"
              action={<QualityBadge quality={validation.quality} score={validation.qualityScore} />}
            />

            <div className="grid grid-cols-3 gap-3 text-sm">
              <Stat label="Area" value={`${validation.areaHectares.toLocaleString()} ha`} />
              <Stat label="Quality score" value={`${validation.qualityScore}/100`} />
              <Stat label="Issues" value={String(validation.issues.length)} />
            </div>

            <ul className="mt-4 space-y-2">
              {validation.issues.length === 0 && activeSource.polygon && (
                <li className="flex items-center gap-2 rounded-md border border-canopy-100 bg-canopy-50 p-2.5 text-xs text-canopy-800">
                  <CheckCircle2 className="h-4 w-4" /> Geometry passes all checks.
                </li>
              )}
              {validation.issues.map((issue) => (
                <li
                  key={issue.code}
                  className={`flex items-start gap-2 rounded-md border p-2.5 text-xs ${
                    issue.severity === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : issue.severity === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-ink-200 bg-ink-50 text-ink-700"
                  }`}
                >
                  {issue.severity === "error" ? (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                      {issue.code.replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5">{issue.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => toast("Draft saved")}>
              Save as draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={submitting || !activeSource.polygon || validation.quality === "needs_review"}
              onClick={onSubmit}
            >
              {submitting ? "Running pipeline…" : "Onboard supplier & begin monitoring"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {previewBoundary ? (
            <BoundaryMap boundary={previewBoundary} height={420} title={`Preview · ${activeSource.label}`} />
          ) : (
            <Card className="flex h-[420px] items-center justify-center text-center">
              <div>
                <FileWarning className="mx-auto h-10 w-10 text-ink-300" />
                <p className="mt-3 text-sm font-medium text-ink-700">No polygon provided</p>
                <p className="mt-1 text-xs text-ink-500">
                  Add a GeoJSON, paste coordinates, or pick a demo input to preview.
                </p>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader
              title="What happens next"
              subtitle="Steps the system takes once a boundary is accepted"
            />
            <ol className="space-y-2.5 text-sm">
              <Step n={1}>Polygon stored as PostGIS geometry with WDPA / HCV overlap pre-computed.</Step>
              <Step n={2}>2020 baseline composite generated from Hansen GFC + Sentinel-2 archive.</Step>
              <Step n={3}>Initial Sentinel-2 NDVI and Sentinel-1 SAR time series fetched for the monitoring window.</Step>
              <Step n={4}>Risk score computed and supplier added to the monitoring schedule (biweekly cadence).</Step>
              <Step n={5}>Alerts pushed to the alerts queue when thresholds are crossed and confirmed by SAR.</Step>
            </ol>
          </Card>

          <Card>
            <Badge tone="muted">Privacy &amp; sovereignty</Badge>
            <p className="mt-2 text-xs leading-snug text-ink-600">
              Boundary geometry remains private to your tenant. CanopyGuard uses only public satellite imagery and
              does not redistribute supplier coordinates to third parties.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-500">
              <MapPin className="h-3 w-3" /> Files are parsed entirely in your browser — nothing leaves your machine
              in this demo.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-ink-500">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-ink-200/70 bg-ink-50 p-2">
      <p className="text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-medium text-ink-900">{value}</p>
    </div>
  );
}

function ModeTile({
  icon: Icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg border p-4 transition ${
        active
          ? "border-canopy-300 bg-canopy-50"
          : "border-dashed border-ink-300 bg-ink-50/60 hover:border-canopy-400 hover:bg-canopy-50/60"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "text-canopy-800" : "text-canopy-700"}`} />
      <span className={`text-xs font-medium ${active ? "text-canopy-900" : "text-ink-900"}`}>{label}</span>
      <span className="text-[10px] text-ink-500">{hint}</span>
    </button>
  );
}

function QualityBadge({ quality, score }: { quality: string; score: number }) {
  const tone =
    quality === "high"
      ? "low"
      : quality === "medium"
        ? "monitor"
        : quality === "low"
          ? "investigate"
          : "escalate";
  return (
    <Badge tone={tone as any} dot>
      {quality.replace("_", " ")} · {score}
    </Badge>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-canopy-700 text-[11px] font-semibold text-white">
        {n}
      </span>
      <span className="text-ink-700">{children}</span>
    </li>
  );
}
