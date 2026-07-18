/**
 * DownloadPDFButton
 *
 * Wraps @react-pdf/renderer's <PDFDownloadLink> with:
 *   - a styled button that matches the app's design system
 *   - a loading spinner while the PDF is being generated
 *   - an error fallback so the UI never breaks silently
 *
 * Usage:
 *   <DownloadPDFButton
 *     document={<ReceiptPDF {...props} />}
 *     fileName="receipt-001.pdf"
 *     label="Download Receipt"
 *   />
 */
import { PDFDownloadLink, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { DownloadIcon, WarningIcon } from "../icons";

interface Props {
  document: ReactElement<DocumentProps>;
  fileName: string;
  label?: string;
  /** Extra Tailwind classes to override the button appearance. */
  className?: string;
}

export function DownloadPDFButton({
  document,
  fileName,
  label = "Download PDF",
  className = "",
}: Props) {
  return (
    <PDFDownloadLink document={document} fileName={fileName}>
      {({ loading, error }) => (
        <button
          disabled={loading}
          title={error ? `PDF error: ${error}` : label}
          className={[
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
            "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-wait",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {loading ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Generating…
            </>
          ) : error ? (
            <><WarningIcon className="h-3 w-3" /> PDF Error</>
          ) : (
            <>
              <DownloadIcon className="h-3 w-3" />
              {label}
            </>
          )}
        </button>
      )}
    </PDFDownloadLink>
  );
}
