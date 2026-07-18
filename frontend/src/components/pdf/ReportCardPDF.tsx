/**
 * PDF Report Card — generated client-side via @react-pdf/renderer.
 *
 * Sections:
 *   • School header (name, address, board, academic year)
 *   • Student profile block (name, admission no, class, section, guardian)
 *   • Results table (subject | date | marks | max | % | grade)
 *   • Summary bar (total, percentage, overall grade, pass/fail)
 *   • Grade legend (configurable bands)
 *   • Attendance summary row (if provided)
 *   • Teacher / Principal remarks
 *   • Footer
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { COLORS, FONTS, SIZE, SPACING } from "../../lib/pdf-theme";

// ── Types ────────────────────────────────────────────────────
export interface ReportSchool {
  name: string;
  addressLine?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  board?: string;
  currency?: string;
  locale?: string;
  academicYear?: string;
  passPercentage?: number;
}

export interface ReportStudent {
  admissionNo: string;
  name: string;
  class: string;
  section: string;
  guardianName?: string;
  dob?: string;
}

export interface ReportResult {
  exam: string;        // exam name
  subject: string;
  examDate: string;
  marksObtained: number;
  maxMarks: number;
  grade: string | null;
  remark?: string | null;
}

export interface ReportSummary {
  totalObtained: number;
  totalMax: number;
  percentage: number;
  overallGrade: string;
}

export interface ReportAttendance {
  totalDays: number;
  presentDays: number;
  percentage: number;
}

export interface ReportCardPDFProps {
  school: ReportSchool;
  student: ReportStudent;
  results: ReportResult[];
  summary: ReportSummary;
  teacherRemark?: string;
  principalRemark?: string;
  attendance?: ReportAttendance;
}

// ── Grade colours for the legend ────────────────────────────
const GRADE_META: Record<
  string,
  { bg: string; fg: string; label: string }
> = {
  "A+": { bg: "#dcfce7", fg: "#166534", label: "Outstanding (≥ 91%)" },
  A: { bg: "#dcfce7", fg: "#166534", label: "Excellent (81–90%)" },
  "B+": { bg: "#ccfbf1", fg: "#0f766e", label: "Very Good (71–80%)" },
  B: { bg: "#ccfbf1", fg: "#0f766e", label: "Good (61–70%)" },
  "C+": { bg: "#fef9c3", fg: "#854d0e", label: "Above Average (51–60%)" },
  C: { bg: "#fef9c3", fg: "#854d0e", label: "Average (41–50%)" },
  D: { bg: "#ffedd5", fg: "#9a3412", label: "Pass (33–40%)" },
  F: { bg: "#fee2e2", fg: "#b91c1c", label: "Fail (< 33%)" },
};

// ── Helpers ─────────────────────────────────────────────────
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
    borderBottomWidth: 3,
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
  logoText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: SIZE.xl },
  schoolName: { fontFamily: FONTS.bold, fontSize: SIZE.xl, color: COLORS.brand, marginBottom: 2 },
  schoolMeta: { fontSize: SIZE.sm, color: COLORS.muted, lineHeight: 1.4 },
  reportBadge: {
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: COLORS.brand,
    borderRadius: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  reportTitle: { fontFamily: FONTS.bold, fontSize: SIZE.lg, color: COLORS.brand },
  reportSub: { fontSize: SIZE.xs, color: COLORS.muted, marginTop: 2 },

  // ─ Section label ─
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
    backgroundColor: COLORS.bg,
    borderRadius: 4,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoCell: { width: "33%", marginBottom: SPACING.sm },
  infoLabel: { fontSize: SIZE.xs, color: COLORS.muted, marginBottom: 1 },
  infoValue: { fontFamily: FONTS.bold, fontSize: SIZE.base },

  // ─ Results table ─
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: COLORS.brand,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  thText: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: SIZE.sm },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SIZE.xs,
    alignItems: "center",
  },
  tableRowAlt: { backgroundColor: COLORS.bg },

  // column widths
  cExam: { flex: 3 },
  cSubject: { flex: 3 },
  cDate: { flex: 2 },
  cMarks: { flex: 1.5, textAlign: "right" },
  cMax: { flex: 1.5, textAlign: "right" },
  cPct: { flex: 1.5, textAlign: "right" },
  cGrade: { flex: 1.5, textAlign: "center" },

  tdText: { fontSize: SIZE.sm },
  gradeChip: {
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    alignSelf: "center",
    fontSize: SIZE.sm,
    fontFamily: FONTS.bold,
  },

  // ─ Summary bar ─
  summaryBar: {
    flexDirection: "row",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  summaryCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  summaryCellLast: { borderRightWidth: 0 },
  summaryLabel: { fontSize: SIZE.xs, color: COLORS.muted, marginBottom: 2 },
  summaryValue: { fontFamily: FONTS.bold, fontSize: SIZE.lg },
  summaryPass: { backgroundColor: COLORS.successLight },
  summaryFail: { backgroundColor: COLORS.dangerLight },
  summaryNeutral: { backgroundColor: COLORS.bg },

  // ─ Grade legend ─
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: SPACING.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.sm,
    marginBottom: 2,
  },
  legendChip: {
    width: 20,
    height: 12,
    borderRadius: 2,
    marginRight: 3,
  },
  legendText: { fontSize: SIZE.xs, color: COLORS.muted },

  // ─ Attendance ─
  attendanceRow: {
    flexDirection: "row",
    backgroundColor: COLORS.bg,
    borderRadius: 4,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xl,
    marginTop: SPACING.xs,
  },
  attCell: { alignItems: "center", flex: 1 },
  attValue: { fontFamily: FONTS.bold, fontSize: SIZE.lg },
  attLabel: { fontSize: SIZE.xs, color: COLORS.muted, marginTop: 2 },

  // ─ Remarks ─
  remarkBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: SPACING.md,
    backgroundColor: COLORS.bg,
  },
  remarkText: { fontSize: SIZE.sm, lineHeight: 1.5, color: COLORS.text },

  // ─ Signature row ─
  sigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.xxl,
  },
  sigBox: { alignItems: "center", width: 120 },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: COLORS.text,
    width: "100%",
    marginBottom: 3,
  },
  sigLabel: { fontSize: SIZE.xs, color: COLORS.muted },

  // ─ Footer ─
  footer: {
    position: "absolute",
    bottom: SPACING.xl,
    left: SPACING.xxl,
    right: SPACING.xxl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerNote: { fontSize: SIZE.xs, color: COLORS.muted },
  pageNo: { fontSize: SIZE.xs, color: COLORS.muted },
});

// ── Component ────────────────────────────────────────────────
export function ReportCardPDF({
  school,
  student,
  results,
  summary,
  teacherRemark,
  principalRemark,
  attendance,
}: ReportCardPDFProps) {
  const passPercent = school.passPercentage ?? 33;
  const passed = summary.percentage >= passPercent;

  const addressParts = [school.addressLine, school.city, school.state]
    .filter(Boolean)
    .join(", ");
  const contactParts = [school.phone, school.email].filter(Boolean).join("  •  ");

  return (
    <Document
      title={`Report Card — ${student.name}`}
      author={school.name}
      subject="Academic Report Card"
    >
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", flex: 1 }}>
            <View style={s.logoBox}>
              <Text style={s.logoText}>K</Text>
            </View>
            <View>
              <Text style={s.schoolName}>{school.name}</Text>
              {addressParts ? <Text style={s.schoolMeta}>{addressParts}</Text> : null}
              {contactParts ? <Text style={s.schoolMeta}>{contactParts}</Text> : null}
              {school.board ? (
                <Text style={s.schoolMeta}>Board: {school.board}</Text>
              ) : null}
            </View>
          </View>
          <View style={s.reportBadge}>
            <Text style={s.reportTitle}>REPORT CARD</Text>
            {school.academicYear ? (
              <Text style={s.reportSub}>Academic Year: {school.academicYear}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Student ── */}
        <Text style={s.sectionTitle}>Student Profile</Text>
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
            <Text style={s.infoValue}>{student.class} — {student.section}</Text>
          </View>
          {student.guardianName ? (
            <View style={s.infoCell}>
              <Text style={s.infoLabel}>Guardian</Text>
              <Text style={s.infoValue}>{student.guardianName}</Text>
            </View>
          ) : null}
          {student.dob ? (
            <View style={s.infoCell}>
              <Text style={s.infoLabel}>Date of Birth</Text>
              <Text style={s.infoValue}>{fmtDate(student.dob)}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Results table ── */}
        <Text style={s.sectionTitle}>Examination Results</Text>
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.thText, s.cExam]}>Exam</Text>
            <Text style={[s.thText, s.cSubject]}>Subject</Text>
            <Text style={[s.thText, s.cDate]}>Date</Text>
            <Text style={[s.thText, s.cMarks]}>Marks</Text>
            <Text style={[s.thText, s.cMax]}>Max</Text>
            <Text style={[s.thText, s.cPct]}>%</Text>
            <Text style={[s.thText, s.cGrade]}>Grade</Text>
          </View>
          {results.map((r, idx) => {
            const pct =
              r.maxMarks > 0
                ? ((r.marksObtained / r.maxMarks) * 100).toFixed(1)
                : "—";
            const gm = r.grade ? GRADE_META[r.grade] : null;
            return (
              <View
                key={idx}
                style={[s.tableRow, idx % 2 !== 0 ? s.tableRowAlt : {}]}
              >
                <Text style={[s.tdText, s.cExam]}>{r.exam}</Text>
                <Text style={[s.tdText, s.cSubject]}>{r.subject}</Text>
                <Text style={[s.tdText, s.cDate]}>{fmtDate(r.examDate)}</Text>
                <Text style={[s.tdText, s.cMarks]}>{r.marksObtained}</Text>
                <Text style={[s.tdText, s.cMax]}>{r.maxMarks}</Text>
                <Text style={[s.tdText, s.cPct]}>{pct}%</Text>
                <View style={[s.cGrade, { alignItems: "center" }]}>
                  {gm ? (
                    <Text
                      style={[
                        s.gradeChip,
                        { backgroundColor: gm.bg, color: gm.fg },
                      ]}
                    >
                      {r.grade}
                    </Text>
                  ) : (
                    <Text style={s.tdText}>—</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Summary ── */}
        <View style={s.summaryBar}>
          <View style={[s.summaryCell, s.summaryNeutral]}>
            <Text style={s.summaryLabel}>Total Marks Obtained</Text>
            <Text style={s.summaryValue}>
              {summary.totalObtained} / {summary.totalMax}
            </Text>
          </View>
          <View style={[s.summaryCell, s.summaryNeutral]}>
            <Text style={s.summaryLabel}>Percentage</Text>
            <Text style={s.summaryValue}>{summary.percentage.toFixed(1)}%</Text>
          </View>
          <View style={[s.summaryCell, s.summaryNeutral]}>
            <Text style={s.summaryLabel}>Overall Grade</Text>
            <Text style={[s.summaryValue, { color: COLORS.brand }]}>
              {summary.overallGrade}
            </Text>
          </View>
          <View
            style={[
              s.summaryCell,
              s.summaryCellLast,
              passed ? s.summaryPass : s.summaryFail,
            ]}
          >
            <Text style={s.summaryLabel}>Result</Text>
            <Text
              style={[
                s.summaryValue,
                { color: passed ? COLORS.success : COLORS.danger },
              ]}
            >
              {passed ? "PASS" : "FAIL"}
            </Text>
          </View>
        </View>

        {/* ── Grade legend ── */}
        <View style={[s.legend, { marginTop: SPACING.sm }]}>
          {Object.entries(GRADE_META).map(([g, m]) => (
            <View key={g} style={s.legendItem}>
              <View
                style={[s.legendChip, { backgroundColor: m.bg }]}
              />
              <Text style={s.legendText}>
                <Text style={{ fontFamily: FONTS.bold }}>{g}</Text> — {m.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Attendance ── */}
        {attendance && (
          <>
            <Text style={s.sectionTitle}>Attendance Summary</Text>
            <View style={s.attendanceRow}>
              <View style={s.attCell}>
                <Text style={s.attValue}>{attendance.totalDays}</Text>
                <Text style={s.attLabel}>Working Days</Text>
              </View>
              <View style={s.attCell}>
                <Text style={s.attValue}>{attendance.presentDays}</Text>
                <Text style={s.attLabel}>Days Present</Text>
              </View>
              <View style={s.attCell}>
                <Text style={[s.attValue, { color: attendance.percentage >= 75 ? COLORS.success : COLORS.danger }]}>
                  {attendance.percentage.toFixed(1)}%
                </Text>
                <Text style={s.attLabel}>Attendance %</Text>
              </View>
            </View>
          </>
        )}

        {/* ── Remarks ── */}
        {(teacherRemark || principalRemark) && (
          <>
            <Text style={s.sectionTitle}>Remarks</Text>
            <View style={s.remarkBox}>
              {teacherRemark && (
                <View style={{ marginBottom: SPACING.sm }}>
                  <Text style={[s.infoLabel, { marginBottom: 2 }]}>
                    Class Teacher's Remark
                  </Text>
                  <Text style={s.remarkText}>{teacherRemark}</Text>
                </View>
              )}
              {principalRemark && (
                <View>
                  <Text style={[s.infoLabel, { marginBottom: 2 }]}>
                    Principal's Remark
                  </Text>
                  <Text style={s.remarkText}>{principalRemark}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Signatures ── */}
        <View style={s.sigRow}>
          <View style={s.sigBox}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Class Teacher</Text>
          </View>
          <View style={s.sigBox}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Principal</Text>
          </View>
          <View style={s.sigBox}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Parent / Guardian</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerNote}>
            {school.name} — {school.board ?? ""} · This is a computer-generated
            report card.
          </Text>
          <Text
            style={s.pageNo}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
