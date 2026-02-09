"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-black">
        <div className="flex items-center justify-between px-6 py-5">
          <div className="w-6" />
          <Link
            href="/"
            className="text-[#E9CDB0] tracking-[0.26em] font-light text-sm md:text-base"
            style={{ fontFamily: "var(--font-benton)" }}
          >
            INDIA ESQUE
          </Link>
          <button
            onClick={() => setIsMenuOpen(true)}
            className="text-white hover:opacity-70 transition-opacity"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black z-[100]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-12">
              <button
                onClick={() => setIsMenuOpen(false)}
                className="text-white"
              >
                <X className="h-6 w-6" />
              </button>
              <span className="text-white tracking-[0.3em] text-sm flex-1 text-center">
                Indiaesque
              </span>
              <div className="w-6" />
            </div>

            <nav className="space-y-6">
              <Link
                href="/"
                className="block text-white tracking-[0.2em] text-sm py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                HOME
              </Link>
              <Link
                href="/delhi"
                className="block text-cyan-400 tracking-[0.2em] text-sm py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                DELHI
              </Link>
              <Link
                href="/jaipur"
                className="block text-cyan-400 tracking-[0.2em] text-sm py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                JAIPUR
              </Link>
              <Link
                href="/mumbai"
                className="block text-cyan-400 tracking-[0.2em] text-sm py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                MUMBAI
              </Link>
              <Link
                href="/about"
                className="block text-gray-400 tracking-[0.2em] text-sm py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                ABOUT
              </Link>
              <Link
                href="/contact"
                className="block text-gray-400 tracking-[0.2em] text-sm py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                CONTACT
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
