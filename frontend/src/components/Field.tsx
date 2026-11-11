import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../utils/cn";

interface WrapProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, error, hint, required, children, className }: WrapProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-danger">
            {" "}
            *
          </span>
        ) : (
          <span className="ml-1 font-normal text-muted">(optional)</span>
        )}
      </label>
      {children}
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("field-input", className)} {...rest} />;
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("field-input min-h-28 resize-y leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("field-input appearance-none bg-white pr-9", className)} {...rest}>
      {children}
    </select>
  );
}

export function Checkbox({
  id,
  label,
  description,
  checked,
  onChange,
  error,
}: {
  id: string;
  label: ReactNode;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={description ? `${id}-description` : undefined}
          className="mt-1 h-5 w-5 shrink-0 rounded border-line accent-[#081F26]"
        />
        <label htmlFor={id} className="text-sm leading-relaxed text-brand">
          {label}
          {description && (
            <span id={`${id}-description`} className="mt-0.5 block text-xs text-ink-soft">
              {description}
            </span>
          )}
        </label>
      </div>
      {error && (
        <p role="alert" className="field-error ml-8">
          {error}
        </p>
      )}
    </div>
  );
}
