import Link from "next/link";
import { Leaf } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-canopy-700 text-white">
          <Leaf className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink-900">
          Resource not found
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          The supplier, alert, or report you are looking for is not part of this demo dataset.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center rounded-md bg-canopy-700 px-4 py-2 text-xs font-medium text-white hover:bg-canopy-800"
        >
          Return to overview
        </Link>
      </div>
    </div>
  );
}
