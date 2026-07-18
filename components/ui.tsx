"use client";

import React from "react";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function Switch({
  checked,
  onChange,
  label,
  tone = "sky",
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  tone?: "sky" | "amber" | "rose" | "emerald";
  disabled?: boolean;
}) {
  const toneOn = {
    sky: "bg-sky-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    emerald: "bg-emerald-500",
  }[tone];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? toneOn : "bg-border2",
        disabled && "opacity-40",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-fg">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border2 accent-emerald-600"
      />
      {label && <span>{label}</span>}
    </label>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "sky" | "amber" | "rose" | "emerald" | "violet";
}) {
  const tones = {
    slate: "bg-surface2 text-muted",
    sky: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    rose: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
    emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
    violet: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  size = "md",
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  title?: string;
  disabled?: boolean;
}) {
  const variants = {
    default: "border border-border2 bg-surface text-fg hover:bg-surface2",
    primary: "bg-accent text-accent-fg hover:opacity-90",
    ghost: "text-muted hover:bg-surface2 hover:text-fg",
    danger:
      "border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40",
  };
  const sizes = { sm: "px-2 py-1 text-xs", md: "px-3 py-1.5 text-sm" };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-40",
        variants[variant],
        sizes[size],
      )}
    >
      {children}
    </button>
  );
}

export function InlineAdder({
  label,
  placeholder,
  onAdd,
}: {
  label: string;
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

  function commit() {
    if (value.trim()) onAdd(value.trim());
    setValue("");
    setOpen(false);
  }

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setOpen(false);
        }}
        className="w-48 rounded border border-border2 bg-surface px-2 py-1 font-mono text-xs text-fg"
      />
      <Button size="sm" variant="primary" onClick={commit}>
        Add
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        ✕
      </Button>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border2 bg-surface2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40",
            value === o.value
              ? "bg-surface text-fg shadow-sm"
              : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
