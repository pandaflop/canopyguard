import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CaseProvider } from "@/lib/case-store";
import { ToastViewport } from "@/components/ui/ToastViewport";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CaseProvider>
      <div className="flex h-full min-h-screen w-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-ink-50 px-6 py-6 lg:px-10 lg:py-8">
            <div className="mx-auto max-w-[1500px]">{children}</div>
          </main>
        </div>
        <ToastViewport />
      </div>
    </CaseProvider>
  );
}
