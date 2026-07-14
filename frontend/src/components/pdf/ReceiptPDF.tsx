/**
 * PDF Fee Receipt — generated client-side via @react-pdf/renderer.
 *
 * Sections:
 *   • School header (logo placeholder, name, address, board)
 *   • Receipt metadata (receipt no, date, payment mode)
 *   • Student block
 *   • Fee head breakdown table
 *   • Payment summary (total due, this payment, balance)
 *   • Footer (authorised signature, stamp area)
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { COLORS, FONTS, SIZE, SPACING } from "../../lib/pdf-theme";

// Helvetica is a PDF built-in — no external src is required.
// The type union expects either a single source or a bulk list; we satisfy it
// with the BulkLoad shape so the compiler is happy.
Font.register({ family: "Helvetica", fonts: [{ src: "" }] });

// ── Types ────────────────────────────────────────────────────
export interface ReceiptSchool {
  name: string;
  addressLine?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  board?: string;
  currency?: string;
  locale?: string;
}

export interface ReceiptPayment {
  receiptNo: string;
  paidAt: string;
  amount: number;   // this payment, major units
  mode: string;
  reference?: string;
}

export interface ReceiptFeeItem {
  name: string;     // fee head label
  amount: number;   // major units
}

export interface ReceiptStudent {
  admissionNo: string;
  name: string;
  class: string;
  section: string;
  guardianName?: string;
}

export interface ReceiptInvoice {
  title: string;
  dueDate: string;
  totalAmount: number;     // total invoice amount
  previouslyPaid: number;  // paid before this payment
  items: ReceiptFeeItem[];
}

export interface ReceiptPDFProps {
  school: ReceiptSchool;
  student: ReceiptStudent;
  invoice: ReceiptInvoice;
  payment: ReceiptPayment;
  allPayments?: ReceiptPayment[]; // full ledger for this invoice
}

// ── Helpers ─────────────────────────────────────────────────
function fmt(amount: number, currency = "INR", locale = "en-IN") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function fmtMode(mode: string) {
  const map: Record<string, string> = {
    CASH: "Cash",
    CARD: "Card",
    UPI: "UPI / QR",
    BANK: "Bank Transfer",
    CHEQUE: "Cheque",
    OTHER: "Other",
  };
  return map[mode] ?? mode;
}

// ── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: FONTS.regular,
    fontSize: SIZE.base,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.xl,
  },

  // ─ Header ─
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.brand,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.md,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  logoText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZE.xl,
  },
  schoolBlock: { flex: 1 },
  schoolName: {
    fontFamily: FONTS.bold,
    fontSize: SIZE.xl,
    color: COLORS.brand,
    marginBottom: 2,
  },
  schoolMeta: { fontSize: SIZE.sm, color: COLORS.muted, lineHeight: 1.4 },
  receiptBadge: {
    backgroundColor: COLORS.brand,
    borderRadius: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: "flex-end",
  },
  receiptLabel: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZE.md,
    letterSpacing: 1,
  },
  receiptNo: {
    color: COLORS.brandLight,
    fontSize: SIZE.sm,
    marginTop: 2,
  },

  // ─ Section title ─
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZE.sm,
    color: COLORS.brand,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
    marginTop: SPACING.lg,
  },

  // ─ Info grid ─
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    backgroundColor: COLORS.bg,
    borderRadius: 4,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoCell: { width: "48%", marginBottom: SPACING.xs },
  infoLabel: { fontSize: SIZE.xs, color: COLORS.muted, marginBottom: 1 },
  infoValue: { fontFamily: FONTS.bold, fontSize: SIZE.base },

  // ─ Table ─
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  tableHeadText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZE.sm,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  tableRowAlt: { backgroundColor: COLORS.bg },
  cellHead: { flex: 3 },
  cellAmt: { flex: 1, textAlign: "right" },
  tableRowText: { fontSize: SIZE.base },

  // ─ Totals ─
  totalsBox: {
    marginTop: SPACING.sm,
    alignSelf: "flex-end",
    width: 220,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalRowFirst: { borderTopWidth: 0 },
  totalLabel: { fontSize: SIZE.sm, color: COLORS.muted },
  totalValue: { fontSize: SIZE.sm, fontFamily: FONTS.bold },
  totalHighlight: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalHighlightLabel: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: SIZE.md },
  totalHighlightValue: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: SIZE.md },
  balanceRow: { backgroundColor: COLORS.warnLight },
  balancePaid: { backgroundColor: COLORS.successLight },

  // ─ Payment ledger ─
  ledgerRow: {
    flexDirection: "row",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    fontSize: SIZE.sm,
  },
  ledgerDate: { flex: 2, color: COLORS.muted },
  ledgerMode: { flex: 2 },
  ledgerRef: { flex: 3, color: COLORS.muted, fontSize: SIZE.xs },
  ledgerAmt: { flex: 2, textAlign: "right", fontFamily: FONTS.bold },

  // ─ Mode chip ─
  modeChip: {
    backgroundColor: COLORS.accentLight,
    borderRadius: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 1,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  modeChipText: { fontSize: SIZE.xs, color: COLORS.accent, fontFamily: FONTS.bold },

  // ─ Footer ─
  footer: {
    position: "absolute",
    bottom: SPACING.xl,
    left: SPACING.xxl,
    right: SPACING.xxl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerNote: { fontSize: SIZE.xs, color: COLORS.muted, flex: 1 },
  signatureBox: { alignItems: "flex-end" },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: COLORS.text,
    width: 120,
    marginTop: SPACING.xl,
    paddingTop: SPACING.xs,
  },
  signatureText: { fontSize: SIZE.xs, color: COLORS.muted, textAlign: "center" },

  divider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  paid_stamp: {
    position: "absolute",
    top: 120,
    right: SPACING.xxl,
    borderWidth: 3,
    borderColor: COLORS.success,
    borderRadius: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    transform: "rotate(-15deg)",
    opacity: 0.35,
  },
  paid_stamp_text: {
    fontFamily: FONTS.bold,
    fontSize: SIZE.xxl,
    color: COLORS.success,
    letterSpacing: 4,
  },
});

// ── Component ────────────────────────────────────────────────
export function ReceiptPDF({
  school,
  student,
  invoice,
  payment,
  allPayments = [],
}: ReceiptPDFProps) {
  const cur = school.currency ?? "INR";
  const loc = school.locale ?? "en-IN";
  const f = (n: number) => fmt(n, cur, loc);

  const totalPaid = invoice.previouslyPaid + payment.amount;
  const balance = invoice.totalAmount - totalPaid;
  const isFullyPaid = balance <= 0;

  const addressParts = [school.addressLine, school.city, school.state]
    .filter(Boolean)
    .join(", ");
  const contactParts = [school.phone, school.email].filter(Boolean).join("  •  ");

  return (
    <Document
      title={`Receipt ${payment.receiptNo}`}
      author={school.name}
      subject="Fee Receipt"
    >
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", flex: 1 }}>
            <View style={s.logoBox}>
              <Text style={s.logoText}>🎓</Text>
            </View>
            <View style={s.schoolBlock}>
              <Text style={s.schoolName}>{school.name}</Text>
              {addressParts ? (
                <Text style={s.schoolMeta}>{addressParts}</Text>
              ) : null}
              {contactParts ? (
                <Text style={s.schoolMeta}>{contactParts}</Text>
              ) : null}
              {school.board ? (
                <Text style={s.schoolMeta}>Board: {school.board}</Text>
              ) : null}
            </View>
          </View>
          <View style={s.receiptBadge}>
            <Text style={s.receiptLabel}>FEE RECEIPT</Text>
            <Text style={s.receiptNo}>{payment.receiptNo}</Text>
            <Text style={[s.receiptNo, { marginTop: 4 }]}>
              {fmtDate(payment.paidAt)}
            </Text>
          </View>
        </View>

        {/* PAID stamp overlay if fully paid */}
        {isFullyPaid && (
          <View style={s.paid_stamp}>
            <Text style={s.paid_stamp_text}>PAID</Text>
          </View>
        )}

        {/* ── Student info ── */}
        <Text style={s.sectionTitle}>Student Details</Text>
        <View style={s.infoGrid}>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Student Name</Text>
            <Text style={s.infoValue}>{student.name}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Admission No.</Text>
            <Text style={s.infoValue}>{student.admissionNo}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Class &amp; Section</Text>
            <Text style={s.infoValue}>
              {student.class} — Section {student.section}
            </Text>
          </View>
          {student.guardianName ? (
            <View style={s.infoCell}>
              <Text style={s.infoLabel}>Guardian</Text>
              <Text style={s.infoValue}>{student.guardianName}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Invoice info ── */}
        <Text style={s.sectionTitle}>Invoice Details</Text>
        <View style={s.infoGrid}>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Fee Title</Text>
            <Text style={s.infoValue}>{invoice.title}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Due Date</Text>
            <Text style={s.infoValue}>{fmtDate(invoice.dueDate)}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Payment Mode</Text>
            <Text style={s.infoValue}>{fmtMode(payment.mode)}</Text>
          </View>
          {payment.reference ? (
            <View style={s.infoCell}>
              <Text style={s.infoLabel}>Reference / Txn ID</Text>
              <Text style={s.infoValue}>{payment.reference}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Fee head breakdown ── */}
        <Text style={s.sectionTitle}>Fee Breakdown</Text>
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.tableHeadText, s.cellHead]}>Fee Head</Text>
            <Text style={[s.tableHeadText, s.cellAmt]}>Amount</Text>
          </View>
          {invoice.items.map((item, idx) => (
            <View
              key={idx}
              style={[s.tableRow, idx % 2 !== 0 ? s.tableRowAlt : {}]}
            >
              <Text style={[s.tableRowText, s.cellHead]}>{item.name}</Text>
              <Text style={[s.tableRowText, s.cellAmt]}>{f(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* ── Payment summary ── */}
        <View style={s.totalsBox}>
          <View style={s.totalHighlight}>
            <Text style={s.totalHighlightLabel}>Invoice Total</Text>
            <Text style={s.totalHighlightValue}>{f(invoice.totalAmount)}</Text>
          </View>
          {invoice.previouslyPaid > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Previously Paid</Text>
              <Text style={s.totalValue}>{f(invoice.previouslyPaid)}</Text>
            </View>
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>This Payment</Text>
            <Text style={[s.totalValue, { color: COLORS.accent }]}>
              {f(payment.amount)}
            </Text>
          </View>
          <View
            style={[
              s.totalRow,
              isFullyPaid ? s.balancePaid : s.balanceRow,
            ]}
          >
            <Text style={s.totalLabel}>
              {isFullyPaid ? "✔ Fully Paid" : "Balance Due"}
            </Text>
            <Text
              style={[
                s.totalValue,
                { color: isFullyPaid ? COLORS.success : COLORS.danger },
              ]}
            >
              {isFullyPaid ? "—" : f(balance)}
            </Text>
          </View>
        </View>

        {/* ── Payment ledger (if multiple payments) ── */}
        {allPayments.length > 1 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: SPACING.lg }]}>
              Payment History
            </Text>
            <View style={s.table}>
              <View style={s.tableHead}>
                <Text style={[s.tableHeadText, { flex: 2 }]}>Date</Text>
                <Text style={[s.tableHeadText, { flex: 2 }]}>Mode</Text>
                <Text style={[s.tableHeadText, { flex: 3 }]}>Reference</Text>
                <Text style={[s.tableHeadText, { flex: 2, textAlign: "right" }]}>
                  Amount
                </Text>
              </View>
              {allPayments.map((p, idx) => (
                <View
                  key={idx}
                  style={[s.ledgerRow, idx % 2 !== 0 ? s.tableRowAlt : {}]}
                >
                  <Text style={s.ledgerDate}>{fmtDate(p.paidAt)}</Text>
                  <Text style={s.ledgerMode}>{fmtMode(p.mode)}</Text>
                  <Text style={s.ledgerRef}>{p.reference ?? "—"}</Text>
                  <Text style={s.ledgerAmt}>{f(p.amount)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerNote}>
            This is a computer-generated receipt. No signature required.
            {"\n"}
            {school.name} — {school.board ?? ""}
          </Text>
          <View style={s.signatureBox}>
            <View style={s.signatureLine}>
              <Text style={s.signatureText}>Authorised Signatory</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
