"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function FloatingActionButton() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Show FAB after a short delay for entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Hide FAB on homepage since it has its own upload
  if (pathname === "/") {
    return null;
  }

  const menuItems = [
    {
      label: "Upload New Design",
      href: "/",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      gradient: "from-primary to-accent",
    },
    {
      label: "My Designs",
      href: "/designs",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      gradient: "from-accent to-primary",
      hide: pathname === "/designs",
    },
  ];

  const visibleItems = menuItems.filter(item => !item.hide);

  return (
    <>
      {/* Backdrop when menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`
          fixed bottom-6 right-6 z-50
          flex flex-col-reverse items-end gap-3
          transition-all duration-500
          ${isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"}
        `}
      >
        {/* Menu Items */}
        {isOpen && visibleItems.map((item, index) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={() => setIsOpen(false)}
            className={`
              flex items-center gap-3 pl-4 pr-5 py-3
              bg-white rounded shadow-card
              border border-border
              hover:scale-105 active:scale-95
              transition-all duration-200
              animate-slideUp
              min-h-[48px]
            `}
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center text-white">
              {item.icon}
            </div>
            <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
          </Link>
        ))}

        {/* Main FAB Button - Orange for 10% accent color */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-14 h-14
            bg-orange
            text-white
            rounded
            shadow-orange-glow
            hover:shadow-orange-glow-hover
            hover:bg-orange-hover
            hover:scale-110
            active:scale-95
            transition-all duration-300
            flex items-center justify-center
            ${isVisible && !isOpen ? "animate-bounce-subtle" : ""}
          `}
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          <svg
            className={`w-7 h-7 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </>
  );
}
