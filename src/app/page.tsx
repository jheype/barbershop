"use client";

import React, { useEffect } from "react";
import AOS from "aos";
import Link from "next/link";
import "aos/dist/aos.css";
import { FaHome, FaEnvelope, FaPhoneAlt, FaWhatsapp, FaInstagram } from "react-icons/fa";

const socialLinks = [
  { icon: FaInstagram, label: "Instagram", href: "https://www.instagram.com/" },
];

const contactInfo = [
  { icon: FaHome, text: "123 Example Street, City Centre" },
  { icon: FaEnvelope, text: "hello.com", link: "mailto:hello.com" },
  { icon: FaPhoneAlt, text: "++00 000 000 0000" },
  { icon: FaWhatsapp, text: "++00 000 000 0000" },
];

const services = [
  { label: "Beard" },
  { label: "Haircut" },
  { label: "Grooming" },
];

function GradientPhotoPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "relative w-full h-full overflow-hidden",
        "bg-gradient-to-br from-indigo-600/40 via-fuchsia-500/25 to-slate-900/60",
        "after:absolute after:inset-0 after:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.14),transparent_55%)]",
        className,
      ].join(" ")}
      aria-hidden="true"
    />
  );
}

export default function App() {
  useEffect(() => {
    if (typeof window !== "undefined") AOS.init({ once: true });
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="relative isolate">
        <div className="relative w-full min-h-[70vh] md:min-h-[80vh]">
          {/* Background placeholder (replaces image) */}
          <div className="absolute inset-0">
            <GradientPhotoPlaceholder />
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-[#03050F]/70" />

          <header className="relative z-10 px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto flex items-center justify-between gap-3">
            <h1 className="text-2xl md:text-4xl tracking-[6px] md:tracking-[10px] font-bold text-white">
              MODERN STUDIO
            </h1>

            {/* Mobile button */}
            <Link
              href="/admin/login"
              className="md:hidden inline-flex items-center justify-center h-10 px-4 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-bold text-sm tracking-wide active:scale-95 transition"
            >
              DASHBOARD
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center justify-end">
              <ul className="flex gap-6 text-white">
                <li className="hover:text-indigo-500/90 cursor-pointer transition-all hover:scale-105">
                  <Link
                    href="/admin/login"
                    className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-bold rounded-lg active:scale-95 transition"
                  >
                    DASHBOARD
                  </Link>
                </li>
              </ul>
            </nav>
          </header>

          <div
            className="relative z-10 px-4 md:px-6 w-full max-w-6xl mx-auto flex flex-col items-center text-center text-white pt-8 md:pt-14"
            data-aos="fade-zoom-in"
            data-aos-delay="200"
          >
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-semibold leading-tight max-w-4xl">
              More than a service. A complete experience.
            </h2>
            <p className="mt-4 md:mt-6 max-w-2xl font-light text-sm md:text-base text-white/80">
              A space designed for people who value care, comfort, and confidence. Book your slot and enjoy a
              modern, premium standard.
            </p>
            <Link href="/agendar" className="inline-block w-full sm:w-auto">
              <button className="mt-6 md:mt-8 px-5 py-3 md:px-6 md:py-3 border-2 rounded-md border-indigo-600 w-full sm:w-56 shadow-lg shadow-indigo-500/20 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-fuchsia-500 hover:scale-105 transition-all duration-300">
                BOOK NOW
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ABOUT — MOBILE */}
      <section className="md:hidden px-4 mt-8 space-y-4">
        <div className="text-white">
          <h3 className="text-2xl font-semibold">Your Local Studio</h3>
          <p className="text-lg font-semibold text-white/80">since 2020</p>
          <p className="text-sm font-light mt-2 text-white/75">
            Built with a simple goal: deliver consistent quality and a relaxed atmosphere. From first-time visitors
            to regulars, every appointment is treated with care, attention to detail, and a modern approach to style.
            Expect clean finishes, comfortable service, and a space that feels premium—without being pretentious.
          </p>
          <button className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-bold rounded-lg active:scale-95 transition">
            Learn more
          </button>
        </div>

        <div className="rounded-xl overflow-hidden border border-white/10">
          <div className="relative w-full aspect-[16/10]">
            <GradientPhotoPlaceholder />
          </div>
        </div>
      </section>

      {/* ABOUT — DESKTOP */}
      <section className="hidden md:block px-6 mt-14">
        <div className="mx-auto w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div data-aos="fade-right" data-aos-delay="150" className="text-white">
            <h3 className="text-5xl font-semibold mb-2 tracking-wide">Your Local Studio</h3>
            <p className="text-2xl font-semibold text-white/80">since 2020</p>
            <p className="text-sm font-light mt-4 max-w-xl text-white/75">
              A modern space built for people who appreciate precision and comfort. We focus on a consistent standard
              across every service, using clean technique, clear communication, and a calm environment. Whether you’re
              after a sharp refresh or a full grooming session, you’ll leave feeling confident and looked after.
            </p>
            <button className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-bold rounded-lg hover:scale-105 transition-transform duration-300">
              Learn more
            </button>
          </div>

          <div data-aos="fade-left" data-aos-delay="150">
            <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden border border-white/10">
              <GradientPhotoPlaceholder />
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES TITLE */}
      <div className="text-center mt-14 md:mt-16 px-4" data-aos="fade-right" data-aos-delay="150">
        <h4 className="text-3xl md:text-4xl font-semibold border-b border-white/30 inline-block pb-1 text-white">
          Services
        </h4>
      </div>

      {/* SERVICES */}
      <section className="mt-8 md:mt-12 px-4 w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          {services.map(({ label }) => (
            <article
              key={label}
              className="group relative rounded-lg overflow-hidden border border-white/10 bg-black/20"
              data-aos="fade-zoom-in"
              data-aos-delay="150"
            >
              <div className="relative w-full aspect-[4/3]">
                <GradientPhotoPlaceholder className="transition group-hover:scale-[1.02]" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white text-center">
                <span className="font-semibold">{label}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="text-center mt-10 md:mt-12 px-4">
        <Link href="/agendar" className="inline-block w-full sm:w-auto">
          <button className="px-5 py-3 border-2 rounded-md border-indigo-600 w-full sm:w-56 text-white shadow-lg hover:bg-gradient-to-r hover:from-indigo-600 hover:to-fuchsia-500 hover:scale-105 transition-all duration-300">
            BOOK AN APPOINTMENT
          </button>
        </Link>
      </div>

      {/* FOOTER */}
      <footer className="bg-[#1F2122] w-full mt-16 md:mt-20 px-4 py-10 md:p-6 text-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 items-start">
          <div data-aos="fade-right" data-aos-delay="150">
            <h5 className="text-2xl font-semibold border-b border-slate-700 pb-1">MODERN STUDIO</h5>
            <p className="pt-6 md:pt-8 text-sm font-light text-white/70 max-w-sm">
              Style, tradition, and care—refined for a modern standard. Clean work, consistent quality, and a calm
              experience from start to finish.
            </p>
          </div>

          <div data-aos="fade-right" data-aos-delay="150">
            <h5 className="text-2xl font-semibold border-b border-slate-700 pb-1">SOCIAL</h5>
            <ul className="flex flex-row md:flex-col gap-4 pt-6 md:pt-8">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <li key={label} className="flex items-center gap-x-2">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-x-2 hover:text-indigo-400 transition-colors"
                  >
                    <Icon className="text-2xl" />
                    <span>{label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div data-aos="fade-right" data-aos-delay="150">
            <h5 className="text-2xl font-semibold border-b border-slate-700 pb-1">CONTACT</h5>
            <ul className="flex flex-col gap-y-4 pt-6 md:pt-8">
              {contactInfo.map(({ icon: Icon, text, link }) => (
                <li key={text} className="flex items-center gap-x-3">
                  <Icon className="text-2xl" />
                  {link ? (
                    <a href={link} className="underline">
                      {text}
                    </a>
                  ) : (
                    text
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>

      <div className="bg-[#121213] text-center py-4">
        <p className="text-white text-xs md:text-sm">© 2026 Copyright: Modern Studio</p>
      </div>
    </>
  );
}
