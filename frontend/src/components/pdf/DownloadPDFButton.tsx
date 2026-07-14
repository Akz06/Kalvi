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
            <>⚠ PDF Error</>
          ) : (
            <>
              <svg
                className="h-3 w-3"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              {label}
            </>
          )}
        </button>
      )}
    </PDFDownloadLink>
  );
}
