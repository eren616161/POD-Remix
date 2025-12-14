"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import AuthModal from "./AuthModal";
import Link from "next/link";
import { getProjectCount } from "@/lib/actions/projects";

export default function Header() {
  const pathname = usePathname();
  const { user, isLoading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isHomePage = pathname === "/";
  const isDesignsPage = pathname === "/designs";

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDarkMode;
    setIsDarkMode(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  // Fetch project count when user is logged in using server action
  useEffect(() => {
    if (user?.id) {
      getProjectCount().then(count => {
        setProjectCount(count);
      }).catch(error => {
        console.error("Failed to fetch project count:", error);
      });
    } else {
      setProjectCount(null);
    }
  }, [user?.id]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 md:px-8">
        <div className="max-w-6xl mx-auto h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center text-primary hover:opacity-80 transition-opacity">
            {/* Full logo on desktop */}
            <svg className="h-7 hidden sm:block" viewBox="0 0 233 43">
              <g transform="translate(0, 1)">
                <path d="M39.8278 33.3026L39.8308 33.3061L33.3607 38.9831C32.0341 40.1758 30.3188 40.8515 28.5307 40.8849L28.5157 40.8852H6.3433C5.52252 40.9197 4.70461 40.766 3.9529 40.4361C3.18789 40.1004 2.51205 39.5912 1.97981 38.9489C1.44755 38.3069 1.07385 37.55 0.888129 36.7388C0.705857 35.9416 0.709812 35.1125 0.900558 34.3168L2.60764 25.6248C2.75949 24.8681 3.16084 24.1833 3.74828 23.6792L3.83198 23.6074C3.65027 23.3331 3.51734 23.0292 3.43941 22.709C3.33602 22.2843 3.3324 21.8424 3.42763 21.4174L5.13811 12.7091L5.14074 12.6968C5.47362 11.1342 6.31209 9.72339 7.52782 8.68041L13.4516 3.48275C13.7257 3.16967 14.0266 2.87803 14.3521 2.61141C15.6488 1.54924 17.2624 0.944386 18.9409 0.890845L18.9688 0.889954L41.1681 0.953502C41.988 0.919415 42.8049 1.07313 43.5558 1.40267C44.3209 1.73844 44.9967 2.24759 45.5289 2.88973C46.0611 3.53177 46.4349 4.28874 46.6206 5.10019C46.8031 5.89771 46.7988 6.72616 46.6084 7.52144L42.3681 29.1669L42.362 29.1933C41.9896 30.8017 41.0994 32.2445 39.8278 33.3026Z" fill="#0F766E"/>
                <path d="M40.8216 2.95355C41.4048 2.92412 41.9868 3.03161 42.5211 3.26725C43.0554 3.50288 43.5272 3.86014 43.8988 4.31063C44.2703 4.76113 44.5313 5.29225 44.661 5.86162C44.7906 6.43099 44.7853 7.02284 44.6454 7.58977L40.4233 29.2491C40.1268 30.536 39.4127 31.6886 38.3925 32.5273C37.3723 33.3659 36.1032 33.8434 34.7832 33.8853H12.6929C12.1096 33.9143 11.5275 33.8068 10.993 33.5712C10.4585 33.3356 9.98642 32.9785 9.61431 32.5282C9.24221 32.078 8.98033 31.5471 8.84959 30.9778C8.71885 30.4086 8.72283 29.8165 8.86121 29.2491L10.566 20.4866C10.6659 20.0589 10.9045 19.6763 11.2445 19.3983C11.5845 19.1202 12.0069 18.9623 12.446 18.9492C16.4769 19.0926 20.3485 19.3952 23.9572 20.6937L24.7538 25.7043C24.7733 25.8253 24.8371 25.9346 24.9328 26.0112C25.0285 26.0877 25.1492 26.126 25.2716 26.1185C25.4122 26.1161 25.5496 26.0765 25.6699 26.0038C25.7902 25.931 25.8892 25.8277 25.9567 25.7043L28.6811 20.6937L34.13 18.9731C34.2618 18.9309 34.3804 18.8551 34.474 18.7532C34.5676 18.6512 34.633 18.5266 34.6637 18.3916C34.6949 18.2723 34.6802 18.1456 34.6228 18.0365C34.5653 17.9274 34.4691 17.8439 34.353 17.8021L29.5733 16.0894L28.7767 11.079C28.7573 10.9573 28.6938 10.847 28.5983 10.7691C28.5028 10.6913 28.382 10.6513 28.2589 10.6567C28.1175 10.66 27.9795 10.7008 27.8591 10.775C27.7387 10.8492 27.6402 10.9541 27.5738 11.079L24.8494 16.0894C20.8987 17.2226 16.8109 17.8071 12.7009 17.8261C12.5036 17.8429 12.3052 17.8124 12.1219 17.7376C11.9386 17.6627 11.7757 17.5456 11.6466 17.3955C11.5175 17.2454 11.4259 17.0667 11.3793 16.8743C11.3327 16.6819 11.3324 16.481 11.3785 16.2885L13.0833 7.52598C13.3782 6.23972 14.0907 5.0873 15.1096 4.2486C16.1285 3.40989 17.3964 2.93224 18.7154 2.88995L40.8216 2.95355Z" fill="#F97316"/>
              </g>
              <g transform="translate(51, 8.5)">
                <path fill="currentColor" d="M16.71 17.00L10.58 17.00L10.58 12.73L15.90 12.73Q16.91 12.73 17.76 12.31Q18.59 11.89 19.09 11.09Q19.58 10.28 19.58 9.13L19.58 9.13Q19.58 8.01 19.09 7.20Q18.59 6.40 17.76 5.98Q16.91 5.56 15.90 5.56L15.90 5.56L10.58 5.56L10.58 1.29L16.71 1.29Q19.05 1.29 20.94 2.23Q22.83 3.18 23.93 4.95Q25.04 6.71 25.04 9.13L25.04 9.13Q25.04 11.54 23.93 13.31Q22.83 15.08 20.94 16.04Q19.05 17.00 16.71 17.00L16.71 17.00ZM11.88 26L6.38 26L6.38 1.29L11.88 1.29L11.88 26ZM39.45 26.42L39.45 26.42Q36.66 26.42 34.29 25.44Q31.93 24.46 30.15 22.71Q28.36 20.96 27.38 18.63Q26.40 16.30 26.40 13.61L26.40 13.61Q26.40 10.88 27.38 8.57Q28.36 6.26 30.11 4.53Q31.86 2.79 34.22 1.83Q36.59 0.87 39.39 0.87L39.39 0.87Q42.15 0.87 44.51 1.83Q46.88 2.79 48.64 4.53Q50.41 6.26 51.39 8.59Q52.37 10.91 52.37 13.64L52.37 13.64Q52.37 16.34 51.39 18.67Q50.41 20.99 48.66 22.73Q46.91 24.46 44.55 25.44Q42.19 26.42 39.45 26.42ZM39.39 21.41L39.39 21.41Q41.59 21.41 43.25 20.43Q44.92 19.45 45.83 17.69Q46.73 15.92 46.73 13.61L46.73 13.61Q46.73 11.86 46.21 10.44Q45.69 9.02 44.70 7.99Q43.73 6.96 42.38 6.42Q41.03 5.87 39.39 5.87L39.39 5.87Q37.18 5.87 35.52 6.84Q33.86 7.80 32.95 9.53Q32.04 11.26 32.04 13.61L32.04 13.61Q32.04 15.36 32.56 16.80Q33.09 18.23 34.05 19.26Q35.01 20.29 36.38 20.86Q37.74 21.41 39.39 21.41ZM65.15 26L58.88 26L58.88 21.17L65.01 21.17Q67.25 21.17 68.93 20.28Q70.61 19.38 71.52 17.67Q72.43 15.95 72.43 13.61L72.43 13.61Q72.43 11.26 71.50 9.58Q70.57 7.90 68.91 6.99Q67.25 6.08 65.01 6.08L65.01 6.08L58.71 6.08L58.71 1.29L65.08 1.29Q67.88 1.29 70.24 2.18Q72.60 3.07 74.37 4.74Q76.14 6.40 77.10 8.66Q78.06 10.91 78.06 13.64L78.06 13.64Q78.06 16.34 77.10 18.61Q76.14 20.89 74.39 22.54Q72.64 24.18 70.27 25.09Q67.91 26 65.15 26L65.15 26ZM60.67 26L55.17 26L55.17 1.29L60.67 1.29L60.67 26ZM96.72 15.81L91.01 15.81L91.01 11.75L96.23 11.75Q97.87 11.75 98.76 10.91Q99.66 10.07 99.66 8.64L99.66 8.64Q99.66 7.31 98.78 6.43Q97.91 5.56 96.26 5.56L96.26 5.56L91.01 5.56L91.01 1.29L96.89 1.29Q99.34 1.29 101.20 2.22Q103.05 3.14 104.10 4.79Q105.15 6.43 105.15 8.57L105.15 8.57Q105.15 10.74 104.10 12.37Q103.05 13.99 101.16 14.90Q99.27 15.81 96.72 15.81L96.72 15.81ZM92.31 26L86.81 26L86.81 1.29L92.31 1.29L92.31 26ZM106.76 26L100.25 26L92.55 15.36L97.59 13.99L106.76 26ZM115.93 26.39L115.93 26.39Q113.17 26.39 111.01 25.25Q108.86 24.11 107.64 22.08Q106.41 20.05 106.41 17.49L106.41 17.49Q106.41 14.94 107.62 12.93Q108.83 10.91 110.89 9.76Q112.96 8.60 115.55 8.60L115.55 8.60Q118.07 8.60 119.99 9.69Q121.92 10.77 123.02 12.70Q124.12 14.62 124.12 17.11L124.12 17.11Q124.12 17.56 124.07 18.07Q124.02 18.58 123.88 19.24L123.88 19.24L109.21 19.28L109.21 15.60L121.60 15.57L119.29 17.11Q119.26 15.64 118.84 14.68Q118.42 13.71 117.59 13.21Q116.77 12.70 115.58 12.70L115.58 12.70Q114.32 12.70 113.39 13.28Q112.47 13.85 111.96 14.90Q111.45 15.95 111.45 17.46L111.45 17.46Q111.45 18.96 111.99 20.03Q112.54 21.10 113.53 21.68Q114.53 22.25 115.90 22.25L115.90 22.25Q117.16 22.25 118.17 21.82Q119.19 21.38 119.96 20.50L119.96 20.50L122.90 23.45Q121.64 24.91 119.85 25.65Q118.07 26.39 115.93 26.39ZM131.37 26L126.01 26L126.01 8.99L131.37 8.99L131.37 26ZM142.25 26L136.90 26L136.90 16.06Q136.90 14.76 136.11 14.05Q135.32 13.33 134.17 13.33L134.17 13.33Q133.36 13.33 132.73 13.66Q132.10 13.99 131.73 14.59Q131.37 15.18 131.37 16.06L131.37 16.06L129.30 15.15Q129.30 13.12 130.18 11.67Q131.05 10.21 132.56 9.43Q134.06 8.64 135.95 8.64L135.95 8.64Q137.74 8.64 139.15 9.44Q140.57 10.25 141.41 11.68Q142.25 13.12 142.25 15.11L142.25 15.11L142.25 26ZM153.14 26L147.78 26L147.78 16.06Q147.78 14.76 146.99 14.05Q146.21 13.33 145.05 13.33L145.05 13.33Q144.25 13.33 143.62 13.66Q142.99 13.99 142.62 14.59Q142.25 15.18 142.25 16.06L142.25 16.06L139.17 15.64Q139.24 13.47 140.20 11.91Q141.17 10.35 142.76 9.50Q144.35 8.64 146.35 8.64L146.35 8.64Q148.31 8.64 149.83 9.46Q151.35 10.28 152.24 11.81Q153.14 13.33 153.14 15.46L153.14 15.46L153.14 26ZM161.22 26L155.87 26L155.87 8.99L161.22 8.99L161.22 26ZM158.56 6.64L158.56 6.64Q157.30 6.64 156.48 5.79Q155.66 4.93 155.66 3.70L155.66 3.70Q155.66 2.44 156.48 1.60Q157.30 0.76 158.56 0.76L158.56 0.76Q159.82 0.76 160.63 1.60Q161.43 2.44 161.43 3.70L161.43 3.70Q161.43 4.93 160.63 5.79Q159.82 6.64 158.56 6.64ZM181.03 26L174.84 26L170.74 19.38L169.59 18.65L162.90 8.99L169.17 8.99L172.98 15.18L174.10 15.88L181.03 26ZM168.43 26L162.59 26L169.55 16.09L172.60 19.52L168.43 26ZM180.68 8.99L174.07 18.61L171.02 15.18L174.87 8.99L180.68 8.99Z"/>
              </g>
            </svg>
            {/* Icon only on mobile */}
            <svg className="h-8 w-8 sm:hidden" viewBox="0 0 47 43">
              <path d="M39.8278 33.3026L39.8308 33.3061L33.3607 38.9831C32.0341 40.1758 30.3188 40.8515 28.5307 40.8849L28.5157 40.8852H6.3433C5.52252 40.9197 4.70461 40.766 3.9529 40.4361C3.18789 40.1004 2.51205 39.5912 1.97981 38.9489C1.44755 38.3069 1.07385 37.55 0.888129 36.7388C0.705857 35.9416 0.709812 35.1125 0.900558 34.3168L2.60764 25.6248C2.75949 24.8681 3.16084 24.1833 3.74828 23.6792L3.83198 23.6074C3.65027 23.3331 3.51734 23.0292 3.43941 22.709C3.33602 22.2843 3.3324 21.8424 3.42763 21.4174L5.13811 12.7091L5.14074 12.6968C5.47362 11.1342 6.31209 9.72339 7.52782 8.68041L13.4516 3.48275C13.7257 3.16967 14.0266 2.87803 14.3521 2.61141C15.6488 1.54924 17.2624 0.944386 18.9409 0.890845L18.9688 0.889954L41.1681 0.953502C41.988 0.919415 42.8049 1.07313 43.5558 1.40267C44.3209 1.73844 44.9967 2.24759 45.5289 2.88973C46.0611 3.53177 46.4349 4.28874 46.6206 5.10019C46.8031 5.89771 46.7988 6.72616 46.6084 7.52144L42.3681 29.1669L42.362 29.1933C41.9896 30.8017 41.0994 32.2445 39.8278 33.3026Z" fill="#0F766E"/>
              <path d="M40.8216 2.95355C41.4048 2.92412 41.9868 3.03161 42.5211 3.26725C43.0554 3.50288 43.5272 3.86014 43.8988 4.31063C44.2703 4.76113 44.5313 5.29225 44.661 5.86162C44.7906 6.43099 44.7853 7.02284 44.6454 7.58977L40.4233 29.2491C40.1268 30.536 39.4127 31.6886 38.3925 32.5273C37.3723 33.3659 36.1032 33.8434 34.7832 33.8853H12.6929C12.1096 33.9143 11.5275 33.8068 10.993 33.5712C10.4585 33.3356 9.98642 32.9785 9.61431 32.5282C9.24221 32.078 8.98033 31.5471 8.84959 30.9778C8.71885 30.4086 8.72283 29.8165 8.86121 29.2491L10.566 20.4866C10.6659 20.0589 10.9045 19.6763 11.2445 19.3983C11.5845 19.1202 12.0069 18.9623 12.446 18.9492C16.4769 19.0926 20.3485 19.3952 23.9572 20.6937L24.7538 25.7043C24.7733 25.8253 24.8371 25.9346 24.9328 26.0112C25.0285 26.0877 25.1492 26.126 25.2716 26.1185C25.4122 26.1161 25.5496 26.0765 25.6699 26.0038C25.7902 25.931 25.8892 25.8277 25.9567 25.7043L28.6811 20.6937L34.13 18.9731C34.2618 18.9309 34.3804 18.8551 34.474 18.7532C34.5676 18.6512 34.633 18.5266 34.6637 18.3916C34.6949 18.2723 34.6802 18.1456 34.6228 18.0365C34.5653 17.9274 34.4691 17.8439 34.353 17.8021L29.5733 16.0894L28.7767 11.079C28.7573 10.9573 28.6938 10.847 28.5983 10.7691C28.5028 10.6913 28.382 10.6513 28.2589 10.6567C28.1175 10.66 27.9795 10.7008 27.8591 10.775C27.7387 10.8492 27.6402 10.9541 27.5738 11.079L24.8494 16.0894C20.8987 17.2226 16.8109 17.8071 12.7009 17.8261C12.5036 17.8429 12.3052 17.8124 12.1219 17.7376C11.9386 17.6627 11.7757 17.5456 11.6466 17.3955C11.5175 17.2454 11.4259 17.0667 11.3793 16.8743C11.3327 16.6819 11.3324 16.481 11.3785 16.2885L13.0833 7.52598C13.3782 6.23972 14.0907 5.0873 15.1096 4.2486C16.1285 3.40989 17.3964 2.93224 18.7154 2.88995L40.8216 2.95355Z" fill="#F97316"/>
            </svg>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {isLoading ? (
              <div className="w-20 h-9 bg-secondary rounded animate-pulse" />
            ) : user ? (
              <>
                {/* Projects Link - hidden on designs page */}
                {!isDesignsPage && (
                  <Link
                    href="/designs"
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-accent hover:text-accent/80 rounded hover:bg-accent/5 transition-all duration-200"
                  >
                    Projects
                    {projectCount !== null && projectCount > 0 && (
                      <span className="text-[10px] font-semibold bg-accent text-white px-1.5 py-0.5 rounded-full tabular-nums min-w-[1.25rem] text-center">
                        {projectCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* Dark Mode Toggle - in header for logged-in users */}
                {isDarkMode !== null && (
                  <button
                    onClick={toggleTheme}
                    className="p-2 text-muted hover:text-accent rounded hover:bg-accent/5 transition-all duration-200"
                    title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                  >
                    {isDarkMode ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Create Icon - hidden on home page */}
                {!isHomePage && (
                  <Link
                    href="/"
                    className="p-2 text-muted hover:text-accent rounded hover:bg-accent/5 transition-all duration-200"
                    title="Create New"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </Link>
                )}

                {/* Profile Icon with Dropdown */}
                <div ref={menuRef} className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="p-2 text-muted hover:text-accent rounded hover:bg-accent/5 transition-all duration-200"
                    title="Profile"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>

                  {/* Profile Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-surface rounded shadow-lg border border-border overflow-hidden z-50 animate-slideDown">
                      {/* User Email */}
                      <div className="px-3 py-2.5 border-b border-border bg-accent/5">
                        <p className="text-xs text-muted truncate">{user.email}</p>
                      </div>

                      {/* Menu Items */}
                      <div className="p-1">
                        <Link
                          href="/"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 w-full px-2.5 py-2 text-sm rounded hover:bg-accent/5 transition-colors text-foreground/80"
                        >
                          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="font-medium">Create New</span>
                        </Link>

                        <Link
                          href="/designs"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 w-full px-2.5 py-2 text-sm rounded hover:bg-accent/5 transition-colors text-foreground/80"
                        >
                          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span className="font-medium">My Projects</span>
                        </Link>

                        <Link
                          href="/settings"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 w-full px-2.5 py-2 text-sm rounded hover:bg-accent/5 transition-colors text-foreground/80"
                        >
                          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="font-medium">Settings</span>
                        </Link>

                        <div className="my-1 mx-2.5 border-t border-border" />

                        <button
                          onClick={async () => {
                            setShowUserMenu(false);
                            await signOut();
                          }}
                          className="flex items-center gap-2 w-full px-2.5 py-2 text-sm rounded hover:bg-destructive/10 transition-colors text-destructive"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span className="font-medium">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Theme toggle for guests */}
                {isDarkMode !== null && (
                  <button
                    onClick={toggleTheme}
                    className="p-2 text-muted hover:text-accent rounded hover:bg-accent/5 transition-all duration-200"
                    title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                  >
                    {isDarkMode ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-3 py-1.5 bg-accent text-white text-sm font-medium rounded shadow-sm hover:shadow-md hover:bg-accent/90 active:scale-[0.98] transition-all duration-200"
                >
                  Get Started
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
}
