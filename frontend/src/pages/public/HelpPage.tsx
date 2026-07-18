import { useState } from "react";
import { Link } from "react-router-dom";
import { SchoolIcon, StudentsIcon, FeesIcon, AttendanceIcon, ExamsIcon, AcademicYearIcon, GuardiansIcon, SettingsIcon, TrendUpIcon, CheckIcon, CloseIcon } from "../../components/icons";

const SECTIONS = [
  {
    slug: "getting-started",
    Icon: TrendUpIcon,
    title: "Getting Started",
    articles: [
      {
        title: "Registering your school",
        content: `
To register your school on Kalvi:

1. Go to **Get Started** (top-right on any public page) or visit **/register**.
2. Fill in:
   - **School Name** — The full name of your school (e.g. "Springdale High School")
   - **School Code** — A short identifier for your school (e.g. "springdale"). Staff will use this to log in.
   - **Board** — CBSE, State Board, ICSE, or IB.
   - **Lowest / Highest Class** — The class range (e.g. Class 1 to Class 12, or LKG to Class 10).
   - **Sections per Class** — How many sections (A, B, C…) each class has.
   - **Admin Email & Password** — Your initial login credentials.
3. Click **Create School**. The system automatically provisions all classes and sections.
4. You are logged in immediately as the school admin.

> **Tip:** The school code cannot be changed later. Choose something short and memorable.
        `,
      },
      {
        title: "Logging in (Admin)",
        content: `
1. Go to **/login**.
2. Enter your **School Code** (the slug you chose at registration).
3. Enter your **Email** and **Password**.
4. Click **Sign In**.

If you forget your school code, check the registration email or ask your system administrator.
        `,
      },
      {
        title: "Logging in (Parent)",
        content: `
Parents have a separate login portal at **/parent/login**.

1. Enter the **School Code** (same as the admin uses — provided at admission).
2. Enter the **Email** and **Password** the school admin set up for you.
3. Click **Sign In** to view your child's attendance, fees, and exam results.

> **Note:** Parent accounts are created by the school admin, not self-registered. Contact your school if you need access.
        `,
      },
    ],
  },
  {
    slug: "students",
    Icon: StudentsIcon,
    title: "Students",
    articles: [
      {
        title: "Adding a new student",
        content: `
1. Go to **Students** in the sidebar.
2. Click **+ Add Student**.
3. Fill in: First Name, Last Name, Admission Number, Gender, Date of Birth, Guardian Name, Guardian Phone, and the **Section** (Class + Section).
4. Click **Add Student**.

The student is immediately visible in the section's list and can be marked for attendance, fees, and exams.
        `,
      },
      {
        title: "Viewing last year's students",
        content: `
Students from previous academic years are available under the **📂 Last Year Students** tab on the Students page.

1. Click **Students** in the sidebar.
2. Switch to the **📂 Last Year Students** tab.
3. Select the academic year from the dropdown.
4. To re-enroll a student in the current year, click **Re-Enroll** next to their name, pick a section, and confirm.
        `,
      },
    ],
  },
  {
    slug: "fees",
    Icon: FeesIcon,
    title: "Fee Management",
    articles: [
      {
        title: "Configuring fee heads per class",
        content: `
Fee heads (categories like "Tuition Fee", "Transport Fee") are configured per class so that each class can have different amounts.

1. Go to **Preferences** > **Fee Configuration**.
2. Select a **Class** from the dropdown.
3. Click **+ Add Fee Head**, enter a name and default amount.
4. Click **Save** on each row.

The default amount is pre-filled when creating a new invoice for a student in that class — editable before saving.
        `,
      },
      {
        title: "Creating a fee invoice",
        content: `
1. Go to **Fees** > click **+ New Fee**.
2. Select a **Student**. The fee heads for that student's class load automatically.
3. Add line items using the **+ Add Item** button — each row is a Fee Head + Amount.
4. Set a **Title** and **Due Date**.
5. Click **Create Invoice**.

The total is computed automatically from the sum of all line items.
        `,
      },
      {
        title: "Recording a payment",
        content: `
1. Expand a fee invoice row.
2. Click **Record Payment**.
3. Enter the **amount paid**, select the **payment mode** (Cash, UPI, Card, Bank Transfer, Cheque), and optionally a **reference / transaction ID**.
4. Click **Record Payment**.

A unique receipt number is generated automatically. You can download a PDF receipt immediately after payment.
        `,
      },
    ],
  },
  {
    slug: "attendance",
    Icon: AttendanceIcon,
    title: "Attendance",
    articles: [
      {
        title: "Marking daily attendance",
        content: `
1. Go to **Attendance** in the sidebar.
2. Select a **Class** and **Section**, then pick the **Date**.
3. Use the dropdown for each student to mark: **Present**, **Absent**, **Late**, or **Leave**.
4. To mark everyone present at once, click **Mark All Present**, then adjust individual records.
5. Click **Save Attendance**.

Attendance is saved per section per day. Re-opening the same section and date loads the saved records for editing.
        `,
      },
    ],
  },
  {
    slug: "exams",
    Icon: ExamsIcon,
    title: "Exams & Report Cards",
    articles: [
      {
        title: "Creating an exam",
        content: `
1. Go to **Exams** in the sidebar.
2. Click **+ New Exam**.
3. Fill in: **Exam Name**, **Class**, **Subject**, **Max Marks**, and **Exam Date**.
4. Click **Create**.

The exam appears in the list. Click **Enter Marks** to record results per student.
        `,
      },
      {
        title: "Downloading a report card",
        content: `
1. Go to **Report Cards** in the sidebar.
2. Select a **Student** from the dropdown.
3. Their full exam history loads with grades and overall percentage.
4. Optionally add **Teacher Remarks** and **Principal Remarks**.
5. Click **Download Report Card (PDF)** to generate and download an A4 PDF.
        `,
      },
    ],
  },
  {
    slug: "academic-years",
    Icon: AcademicYearIcon,
    title: "Academic Years",
    articles: [
      {
        title: "Creating and activating a year",
        content: `
1. Go to **Academic Years** in the sidebar.
2. Click **+ New Year**, enter the name (e.g. "2025-2026"), start date, and end date.
3. To make it the current year, click **Set Active** on the year row.

Only one year can be active at a time. Activating a new year automatically deactivates the previous one.
        `,
      },
      {
        title: "Promoting students",
        content: `
1. Go to **Academic Years** > **Promote / Transfer** tab.
2. Select the **source year** (outgoing) and **destination year** (incoming).
3. Click **Load Students** to see all enrolled students.
4. For each student, choose the **action** (Promoted / Transferred / Left) and the destination section.
5. Click **Confirm Promotion**.

The system creates new enrollment records in the destination year and marks the source-year records as PROMOTED.
        `,
      },
    ],
  },
  {
    slug: "parent-portal",
    Icon: GuardiansIcon,
    title: "Parent Portal",
    articles: [
      {
        title: "Creating a parent account",
        content: `
1. Go to **Guardians** in the admin sidebar.
2. Click **+ Add Guardian**.
3. Select the **student**, enter the guardian's name, relationship (Father/Mother/Guardian), phone, email, and a password.
4. Click **Add Guardian**.

The parent can now log in at **/parent/login** using the school code, their email, and the password you set. You can reset the password anytime from the Guardians page.
        `,
      },
    ],
  },
  {
    slug: "preferences",
    Icon: SettingsIcon,
    title: "Preferences & Configuration",
    articles: [
      {
        title: "Configuring school settings",
        content: `
Go to **Preferences** (bottom of the sidebar) to configure:

- **School Profile** — Name, city, state, address, phone, email, logo URL.
- **Academic** — Board (CBSE/State/ICSE/IB), academic year label, class range, sections per class, pass percentage.
- **Currency & Locale** — Currency code (INR, USD, etc.) and locale for formatting.
- **Fee Configuration** — Per-class fee heads and default amounts.
- **Feature Flags** — Toggle modules on/off. Disabled modules disappear from the sidebar.
        `,
      },
      {
        title: "Toggling modules on/off",
        content: `
Each module (Students, Attendance, Fees, Exams, Parent Portal, Academic Years) can be enabled or disabled per school.

1. Go to **Preferences** > scroll to **Module Feature Flags**.
2. Toggle the switches for the modules you want.
3. Click **Save Preferences**.

Disabled modules are immediately removed from the sidebar and their API endpoints return 403 for that school.
        `,
      },
    ],
  },
];

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].slug);
  const [activeArticle, setActiveArticle] = useState(SECTIONS[0].articles[0].title);

  const currentSection = SECTIONS.find((s) => s.slug === activeSection)!;
  const currentArticle = currentSection.articles.find((a) => a.title === activeArticle) ?? currentSection.articles[0];

  function renderMarkdown(text: string) {
    const lines = text.trim().split("\n");
    const elements: JSX.Element[] = [];
    let listItems: string[] = [];

    function flushList() {
      if (listItems.length > 0) {
        elements.push(
          <ul key={elements.length} className="list-disc list-inside space-y-1 text-slate-600 text-sm my-3">
            {listItems.map((li, i) => <li key={i} dangerouslySetInnerHTML={{ __html: li }} />)}
          </ul>
        );
        listItems = [];
      }
    }

    lines.forEach((line, idx) => {
      const numbered = line.match(/^(\d+)\.\s+(.*)/);
      const bulleted = line.match(/^-\s+(.*)/);
      const blockquote = line.match(/^>\s*(.*)/);
      const h3 = line.match(/^###\s+(.*)/);

      if (numbered) {
        flushList();
        listItems.push(numbered[2].replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>").replace(/`(.*?)`/g, "<code class='bg-slate-100 px-1 rounded text-xs font-mono'>$1</code>"));
      } else if (bulleted) {
        listItems.push(bulleted[1].replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/`(.*?)`/g, "<code class='bg-slate-100 px-1 rounded text-xs font-mono'>$1</code>"));
      } else {
        flushList();
        if (blockquote) {
          elements.push(
            <div key={idx} className="border-l-4 border-teal-400 bg-teal-50 pl-4 py-2 rounded-r-lg my-3 text-sm text-teal-800">
              {blockquote[1]}
            </div>
          );
        } else if (h3) {
          elements.push(<h3 key={idx} className="text-base font-semibold text-slate-800 mt-4 mb-1">{h3[1]}</h3>);
        } else if (line.trim() === "") {
          // skip blank lines
        } else {
          const html = line
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            .replace(/`(.*?)`/g, "<code class='bg-slate-100 px-1 rounded text-xs font-mono'>$1</code>")
            .replace(/\*\/(.*?)\//g, "<em>$1</em>");
          elements.push(<p key={idx} className="text-slate-600 text-sm leading-relaxed my-2" dangerouslySetInnerHTML={{ __html: html }} />);
        }
      }
    });
    flushList();
    return elements;
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <SchoolIcon className="w-7 h-7 text-brand-700" />
            <span className="text-xl font-bold text-brand-800">Kalvi</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link to="/features" className="hover:text-brand-600 transition">Features</Link>
            <Link to="/pricing" className="hover:text-brand-600 transition">Pricing</Link>
            <Link to="/help" className="text-brand-700 font-semibold">Help Guide</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-brand-700">Sign in</Link>
            <Link to="/register" className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-700 transition">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-800 to-teal-700 text-white py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h1 className="text-4xl font-extrabold">Help Guide</h1>
          <p className="text-brand-100 mt-3 text-lg">
            Step-by-step guides for everything in Kalvi.
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 flex gap-8">

        {/* Left sidebar — section nav */}
        <aside className="w-56 flex-shrink-0 hidden md:block">
          <nav className="sticky top-24 space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section.slug}
                onClick={() => {
                  setActiveSection(section.slug);
                  setActiveArticle(section.articles[0].title);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  activeSection === section.slug
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <section.Icon className="w-4 h-4" />
                {section.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* Middle — article list */}
        <div className="w-48 flex-shrink-0 hidden md:block">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
            <currentSection.Icon className="w-4 h-4 inline mr-1" /> {currentSection.title}
          </p>
          <nav className="space-y-1">
            {currentSection.articles.map((article) => (
              <button
                key={article.title}
                onClick={() => setActiveArticle(article.title)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  activeArticle === article.title
                    ? "bg-teal-50 text-teal-700 font-medium"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {article.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Right — article content */}
        <main className="flex-1 min-w-0">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">
              <currentSection.Icon className="w-4 h-4 inline mr-1" /> {currentSection.title}
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              {currentArticle.title}
            </h2>
            <div>{renderMarkdown(currentArticle.content)}</div>
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">Was this helpful?</p>
              <div className="flex gap-2">
                <button className="text-sm border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition">
                  <CheckIcon className="w-4 h-4 inline mr-1" /> Yes
                </button>
                <button className="text-sm border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition">
                  <CloseIcon className="w-4 h-4 inline mr-1" /> No
                </button>
              </div>
            </div>
          </div>

          {/* Mobile article list */}
          <div className="md:hidden mt-6 grid grid-cols-1 gap-2">
            {SECTIONS.map((section) =>
              section.articles.map((article) => (
                <button
                  key={article.title}
                  onClick={() => { setActiveSection(section.slug); setActiveArticle(article.title); }}
                  className="text-left bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm hover:bg-slate-50 transition"
                >
                  <span className="text-slate-400 text-xs">{section.title} ›</span>
                  <br />
                  <span className="font-medium text-slate-700">{article.title}</span>
                </button>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-500 py-8 text-center text-sm mt-12">
        <Link to="/" className="text-white font-bold mr-4 inline-flex items-center gap-1"><SchoolIcon className="w-4 h-4" /> Kalvi</Link>
        <Link to="/features" className="hover:text-white mr-4 transition">Features</Link>
        <Link to="/pricing" className="hover:text-white transition">Pricing</Link>
        <p className="mt-4 text-xs">© {new Date().getFullYear()} Kalvi</p>
      </footer>
    </div>
  );
}
