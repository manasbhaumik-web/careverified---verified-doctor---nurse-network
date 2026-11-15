import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

interface OptionItem {
  value: string;
  label: string;
}

function collectOptions(children: React.ReactNode, out: OptionItem[] = []): OptionItem[] {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as { value?: string | number; children?: React.ReactNode };
    if (child.type === 'option') {
      const label = extractText(props.children).trim();
      const val = props.value !== undefined ? String(props.value) : label;
      out.push({ value: val, label });
    } else if (props && props.children) {
      collectOptions(props.children, out);
    }
  });
  return out;
}

export type CustomSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

export function CustomSelect({
  className = '',
  wrapperClassName = '',
  value,
  defaultValue,
  onChange,
  children,
  disabled,
  style,
  ...rest
}: CustomSelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState<string | undefined>(
    defaultValue !== undefined ? String(defaultValue) : undefined
  );

  const options = collectOptions(children);
  const activeValue = value !== undefined ? String(value) : uncontrolledValue;

  const matchedOption =
    activeValue !== undefined
      ? options.find((opt) => opt.value === activeValue)
      : undefined;

  const displayLabel = matchedOption
    ? matchedOption.label
    : options.length > 0
      ? options[0].label
      : '';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (value === undefined) {
      setUncontrolledValue(e.target.value);
    }
    if (onChange) {
      onChange(e);
    }
  };

  const hasWidth = /\b(w-|flex-1)\b/.test(className);
  const hasHeight = /\bh-(\d+|full|auto|\[)\b/.test(className);
  const hasBg = /\bbg-/.test(className);
  const hasBorder = /\bborder\b/.test(className);
  const hasTextSize = /\btext-(xs|sm|base|lg|\[\d+)/.test(className);

  const defaults = [
    !hasWidth ? 'w-full' : '',
    !hasHeight ? 'h-11' : '',
    !hasBg ? 'bg-[color:var(--t-bg)]' : '',
    !hasBorder ? 'border border-[color:var(--t-200)]' : '',
    !hasTextSize ? 'text-xs' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      style={style}
      className={`custom-select-box relative flex items-center justify-between pl-3 pr-9 font-medium text-[color:var(--ink)] select-none rounded-none transition-colors focus-within:bg-white focus-within:border-[color:var(--t-600)] ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      } ${defaults} ${className} ${wrapperClassName}`.trim()}
    >
      <span className="truncate pointer-events-none leading-normal text-left">
        {displayLabel}
      </span>
      <ChevronDown
        className="h-4 w-4 text-slate-500 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 shrink-0"
        aria-hidden="true"
      />
      <select
        {...rest}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={handleChange}
        className="filter-select-input absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
      >
        {children}
      </select>
    </div>
  );
}

export default CustomSelect;
