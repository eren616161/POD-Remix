"use client";

import { useState, ReactNode } from "react";

interface AccordionCardProps {
  title: string;
  subtitle?: string;
  summary?: string;
  icon?: ReactNode;
  iconBgColor?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  badge?: ReactNode;
}

export default function AccordionCard({
  title,
  subtitle,
  summary,
  icon,
  iconBgColor = "bg-secondary",
  defaultOpen = false,
  children,
  badge,
}: AccordionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-surface border border-border rounded overflow-hidden transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className={`w-9 h-9 rounded-lg ${iconBgColor} flex items-center justify-center shrink-0`}>
              {icon}
            </div>
          )}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              {badge}
            </div>
            {!isOpen && summary && (
              <p className="text-[11px] text-muted mt-0.5 line-clamp-1">{summary}</p>
            )}
            {!isOpen && subtitle && !summary && (
              <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-5 pb-5 pt-2 border-t border-border">{children}</div>
      </div>
    </div>
  );
}

// Specialized accordion for sections with action buttons
interface AccordionCardWithActionsProps extends Omit<AccordionCardProps, 'children'> {
  children: ReactNode;
  actions?: ReactNode;
  isEditing?: boolean;
}

export function AccordionCardWithActions({
  children,
  actions,
  isEditing,
  ...props
}: AccordionCardWithActionsProps) {
  return (
    <AccordionCard {...props}>
      <div className="space-y-4">
        {children}
        {actions && (
          <div className={`flex items-center justify-end gap-2 pt-3 border-t border-border/50 ${isEditing ? '' : 'hidden'}`}>
            {actions}
          </div>
        )}
      </div>
    </AccordionCard>
  );
}

