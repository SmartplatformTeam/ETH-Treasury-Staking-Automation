"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes
} from "react";

type ButtonVariant = "primary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    "border-[var(--miro-ink)] bg-[var(--miro-ink)] text-[var(--miro-canvas)] hover:bg-[var(--miro-canvas)] hover:text-[var(--miro-ink)]",
  ghost:
    "border-[var(--miro-hairline)] bg-transparent text-[var(--miro-ink)] hover:border-[var(--miro-ink)]",
  danger:
    "border-[var(--miro-m-red)] bg-[var(--miro-m-red)] text-white hover:bg-transparent hover:text-[var(--miro-m-red)]"
};

const baseButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-none border px-5 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Button({ variant = "primary", className, type, ...rest }: ButtonProps) {
  const variantClass = variantClassMap[variant];
  const composed = `${baseButtonClass} ${variantClass}${className ? ` ${className}` : ""}`;
  return <button type={type ?? "button"} className={composed} {...rest} />;
}

const baseInputClass =
  "w-full rounded-none border border-[var(--miro-hairline)] bg-[var(--miro-surface-soft)] px-3 py-2 text-sm font-light text-[var(--miro-ink)] placeholder:text-[var(--miro-slate)] focus:border-[var(--miro-ink)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input className={`${baseInputClass}${className ? ` ${className}` : ""}`} {...rest} />;
}

export function Select(
  props: InputHTMLAttributes<HTMLSelectElement> & { children: ReactNode }
) {
  const { className, children, ...rest } = props;
  return (
    <select
      className={`${baseInputClass}${className ? ` ${className}` : ""}`}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </select>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return (
    <textarea
      className={`${baseInputClass} min-h-24 resize-y${className ? ` ${className}` : ""}`}
      {...rest}
    />
  );
}

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  helper?: ReactNode;
  error?: string | null;
  children: ReactNode;
};

export function FormField({ label, htmlFor, helper, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]"
      >
        {label}
      </label>
      {children}
      {helper ? (
        <p className="text-xs font-light text-[var(--miro-slate)]">{helper}</p>
      ) : null}
      {error ? (
        <p className="text-xs font-light text-[var(--miro-m-red)]">{error}</p>
      ) : null}
    </div>
  );
}

type FormAlertTone = "error" | "success";

const alertToneClass: Record<FormAlertTone, string> = {
  error: "border-[var(--miro-m-red)] text-[var(--miro-m-red)]",
  success: "border-[var(--miro-success)] text-[#5ee07b]"
};

export function FormAlert({ tone, children }: { tone: FormAlertTone; children: ReactNode }) {
  return (
    <p
      className={`rounded-none border bg-[var(--miro-surface-soft)] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] ${alertToneClass[tone]}`}
    >
      {children}
    </p>
  );
}
