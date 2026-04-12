'use client';

import { useState, type CSSProperties } from "react";

// ============================================================
// TYPES
// ============================================================

type Environment = "STAGE" | "PROD" | "TEST";

type FormState = {
  partnerName: string;
  customerName: string;
  pollyEnv: "STAGE" | "PROD";
  customerEnv: "TEST" | "PROD";
};

type OutputState = {
  username: string;
  firstName: string;
  lastName: string;
  job: string;
  email: string;
  role: string;
  applicationName: string;
};

type Field = {
  label: string;
  value: string;
};

type FieldRowProps = {
  label: string;
  value: string;
  hideCopy?: boolean;
  copiedKey: string | null;
  onCopy: (label: string, value: string) => void;
};

type StepSectionProps = {
  stepNumber: number;
  title: string;
  summary?: string;
  fields: Field[];
  hideCopy?: boolean;
  copiedKey: string | null;
  onCopy: (label: string, value: string) => void;
};

type InfoSectionProps = {
  title: string;
  items: string[];
};

type InputFormProps = {
  values: FormState;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

// ============================================================
// FORMATTING LOGIC
// ============================================================

function toDisplayCase(env: string): string {
  return env.charAt(0).toUpperCase() + env.slice(1).toLowerCase();
}

function stripSpaces(name: string): string {
  return name.replace(/ /g, "");
}

function buildUsername(
  partnerName: string,
  customerName: string,
  pollyEnv: FormState["pollyEnv"]
): string {
  const partner = stripSpaces(partnerName);
  const customer = stripSpaces(customerName);
  const prefix = partner && customer ? `${partner}_${customer}` : partner || customer;
  return `${prefix}_${toDisplayCase(pollyEnv)}_API`;
}

function buildFirstName(partnerName: string, customerName: string): string {
  return `${stripSpaces(partnerName)} ${stripSpaces(customerName)}`;
}

function buildLastName(customerEnv: FormState["customerEnv"]): string {
  return customerEnv === "PROD" ? "Prod API User" : "Test API User";
}

function buildJob(): string {
  return "API User";
}

function buildEmail(
  partnerName: string,
  customerName: string,
  customerEnv: FormState["customerEnv"]
): string {
  return `${stripSpaces(partnerName)}${stripSpaces(customerName)}${toDisplayCase(customerEnv)}API@pollyex.com`;
}

function buildApplicationName(
  partnerName: string,
  customerName: string,
  customerEnv: FormState["customerEnv"]
): string {
  const label = customerEnv === "PROD" ? "Prod" : "Test";
  return `${stripSpaces(partnerName)} ${stripSpaces(customerName)} ${label} API`;
}

function computeOutputs(
  partnerName: string,
  customerName: string,
  pollyEnv: FormState["pollyEnv"],
  customerEnv: FormState["customerEnv"]
): OutputState {
  return {
    username: buildUsername(partnerName, customerName, pollyEnv),
    firstName: buildFirstName(partnerName, customerName),
    lastName: buildLastName(customerEnv),
    job: buildJob(),
    email: buildEmail(partnerName, customerName, customerEnv),
    role: "Developer",
    applicationName: buildApplicationName(partnerName, customerName, customerEnv),
  };
}

// ============================================================
// UI COMPONENTS
// ============================================================

function FieldRow({ label, value, hideCopy, copiedKey, onCopy }: FieldRowProps) {
  const isCopied = copiedKey === label;

  return (
    <div style={styles.fieldRow}>
      <span style={styles.fieldLabel}>{label}</span>
      <span style={styles.fieldValue}>
        {value || <em style={styles.placeholder}>—</em>}
      </span>
      {!hideCopy && (
        <button
          type="button"
          style={{ ...styles.copyBtn, ...(isCopied ? styles.copyBtnActive : {}) }}
          onClick={() => onCopy(label, value)}
          disabled={!value}
        >
          {isCopied ? "✓ Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}

function StepSection({
  stepNumber,
  title,
  summary,
  fields,
  hideCopy,
  copiedKey,
  onCopy,
}: StepSectionProps) {
  return (
    <div style={styles.stepCard}>
      <div style={styles.stepHeader}>
        <span style={styles.stepBadge}>{stepNumber}</span>
        <div>
          <div style={styles.stepTitle}>{title}</div>
          {summary && <div style={styles.stepSummary}>{summary}</div>}
        </div>
      </div>
      <div style={styles.fieldList}>
        {fields.map((f) => (
          <FieldRow
            key={f.label}
            label={f.label}
            value={f.value}
            hideCopy={hideCopy}
            copiedKey={copiedKey}
            onCopy={onCopy}
          />
        ))}
      </div>
    </div>
  );
}

function InfoSection({ title, items }: InfoSectionProps) {
  return (
    <div style={styles.infoCard}>
      <div style={styles.infoTitle}>{title}</div>
      <ul style={styles.detailsList}>
        {items.map((item, i) => (
          <li key={i} style={styles.detailsItem}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InputForm({ values, onChange }: InputFormProps) {
  const textField = (label: string, key: "partnerName" | "customerName") => (
    <div style={styles.inputRow}>
      <label style={styles.inputLabel}>{label}</label>
      <input
        style={styles.input}
        type="text"
        value={values[key]}
        onChange={(e) => onChange(key, e.target.value)}
        placeholder={`Enter ${label}`}
      />
    </div>
  );

  const selectField = (
    label: string,
    key: "pollyEnv" | "customerEnv",
    options: string[]
  ) => (
    <div style={styles.inputRow}>
      <label style={styles.inputLabel}>{label}</label>
      <select
        style={styles.select}
        value={values[key]}
        onChange={(e) => onChange(key, e.target.value as FormState[typeof key])}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {toDisplayCase(o)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div style={styles.formCard}>
      <div style={styles.formTitle}>Inputs</div>
      <div style={styles.formGrid}>
        {textField("Partner Name", "partnerName")}
        {textField("Customer Name", "customerName")}
        {selectField("Polly Environment", "pollyEnv", ["STAGE", "PROD"])}
        {selectField("Customer Environment", "customerEnv", ["TEST", "PROD"])}
      </div>
    </div>
  );
}

// ============================================================
// ROOT PAGE
// ============================================================

export default function Page() {
  const [form, setForm] = useState<FormState>({
    partnerName: "",
    customerName: "",
    pollyEnv: "PROD",
    customerEnv: "PROD",
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCopy(label: string, value: string) {
    if (!value) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const el = document.createElement("textarea");
        el.value = value;
        el.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
    } catch (e) {
      console.error("Copy failed:", e);
    }

    setCopiedKey(label);
    window.setTimeout(() => setCopiedKey(null), 1800);
  }

  const out = computeOutputs(
    form.partnerName,
    form.customerName,
    form.pollyEnv,
    form.customerEnv
  );

  const steps: StepSectionProps[] = [
    {
      stepNumber: 1,
      title: "Create User (PXA.Users)",
      summary: "First, we create a generic non-admin user.",
      hideCopy: false,
      copiedKey,
      onCopy: handleCopy,
      fields: [
        { label: "Username", value: out.username },
        { label: "FirstName", value: out.firstName },
        { label: "LastName", value: out.lastName },
        { label: "JobTitle", value: out.job },
        { label: "Email", value: out.email },
      ],
    },
    {
      stepNumber: 2,
      title: "Create Organization User (PXA.OrganizationUsers)",
      summary:
        "Next, we associate that user to the organization, while also providing the developer role and ensuring we don't mark them as admin.",
      hideCopy: true,
      copiedKey,
      onCopy: handleCopy,
      fields: [{ label: "Role", value: out.role }],
    },
    {
      stepNumber: 3,
      title: "Create Application (PXA.Applications)",
      summary:
        "Next, we create API credentials, and associate our new developer user to those credentials.",
      hideCopy: false,
      copiedKey,
      onCopy: handleCopy,
      fields: [{ label: "ApplicationName", value: out.applicationName }],
    },
  ];

  const additionalContext = [
    "API credentials (API user) provide access to the Public API; multiple setups may exist per organization (e.g., per integration partner and/or customer).",
    "Provisioning is organization-wide—any API user inherits the same access based on org-level configuration.",
    "An \"iFrame user\" is simply a generic loan officer user created for specific use cases. It is typically used when an integration partner cannot map or sync all individual users (e.g., thousands of brokers), so a single generic user is used to launch the iFrame. In cases where a system (such as a Retail POS) syncs users directly, a generic iFrame user is not needed—they can retrieve users via API and launch the iFrame for the actual loan officer logged into their system.",
  ];

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <h1 style={styles.heading}>API User Provisioning</h1>
          <p style={styles.subheading}>Fill in the fields below. All outputs update instantly.</p>
        </div>

        <InputForm values={form} onChange={handleChange} />

        <div style={styles.stepsContainer}>
          {steps.map((s) => (
            <StepSection
              key={s.stepNumber}
              stepNumber={s.stepNumber}
              title={s.title}
              summary={s.summary}
              fields={s.fields}
              hideCopy={s.hideCopy}
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />
          ))}
        </div>

        <InfoSection title="Additional Detail" items={additionalContext} />
      </div>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f9",
    padding: "32px 16px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: "#1a1a2e",
  },
  container: {
    maxWidth: 720,
    margin: "0 auto",
  },
  pageHeader: {
    marginBottom: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: 700,
    margin: "0 0 4px",
    color: "#111827",
  },
  subheading: {
    fontSize: 14,
    color: "#6b7280",
    margin: 0,
  },
  formCard: {
    background: "#fff",
    borderRadius: 10,
    padding: "20px 24px",
    marginBottom: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  formTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 16,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px 24px",
  },
  inputRow: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
  },
  input: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    outline: "none",
    color: "#111827",
    background: "#fafafa",
  },
  select: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    color: "#111827",
    background: "#fafafa",
    outline: "none",
  },
  stepsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    marginBottom: 16,
  },
  stepCard: {
    background: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  stepHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "14px 20px",
    borderBottom: "1px solid #f0f0f0",
    background: "#fafafa",
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#4f46e5",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1f2937",
  },
  stepSummary: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: 400,
    marginTop: 2,
  },
  fieldList: {
    padding: "4px 0",
  },
  fieldRow: {
    display: "grid",
    gridTemplateColumns: "160px 1fr auto",
    alignItems: "center",
    gap: 12,
    padding: "10px 20px",
    borderBottom: "1px solid #f9fafb",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: "#6b7280",
    whiteSpace: "nowrap",
  },
  fieldValue: {
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
    color: "#111827",
    wordBreak: "break-all",
  },
  placeholder: {
    color: "#d1d5db",
    fontStyle: "normal",
  },
  copyBtn: {
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 5,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#d1d5db",
    background: "#fff",
    color: "#374151",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  },
  copyBtnActive: {
    background: "#ecfdf5",
    borderColor: "#6ee7b7",
    color: "#065f46",
  },
  detailsWrapper: {
    borderTop: "1px solid #f0f0f0",
    padding: "8px 20px 12px",
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 8,
  },
  detailsToggle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "4px 0",
  },
  detailsChevron: {
    fontSize: 9,
    color: "#9ca3af",
    transition: "transform 0.2s",
    display: "inline-block",
  },
  detailsList: {
    margin: "8px 0 0 0",
    paddingLeft: 18,
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  detailsItem: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 1.6,
    listStyleType: "disc",
  },
  infoCard: {
    background: "#fff",
    borderRadius: 10,
    padding: "12px 20px 14px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  infoToggle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "4px 0",
    width: "100%",
    textAlign: "left",
  },
};