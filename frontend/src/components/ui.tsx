import type { ReactNode } from "react";
import { CloseIcon } from "./icons";

export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// Re-exported from Loader.tsx — all existing imports continue to work
export { Spinner, SectionLoader, PageLoader, InlineLoader } from "./Loader";

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center text-slate-400 py-10 text-sm">{text}</div>
  );
}

/**
 * Renders a friendly validation/error block. Accepts either a single message
 * or an array of field-level messages returned by the API's `details`.
 */
export function FormError({
  message,
  issues,
}: {
  message?: string | null;
  issues?: { field: string; message: string }[];
}) {
  if (!message && (!issues || issues.length === 0)) return null;
  const hasList = issues && issues.length > 1;
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {hasList ? (
        <>
          <p className="font-medium mb-1">Please fix the following:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {issues!.map((i, idx) => (
              <li key={idx}>{i.message}</li>
            ))}
          </ul>
        </>
      ) : (
        <p>{issues?.[0]?.message ?? message}</p>
      )}
    </div>
  );
}

/** Small helper text shown beneath an input to explain its rules up front. */
export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-slate-400">{children}</p>;
}
