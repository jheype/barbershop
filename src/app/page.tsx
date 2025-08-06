"use client";

import React, { useEffect } from "react";
import AOS from "aos";
import Link from "next/link";
import "aos/dist/aos.css";
import { 
  FaHome, FaEnvelope, FaPhoneAlt, FaWhatsapp, 
  FaFacebookF, FaGoogle, FaInstagram 
} from "react-icons/fa";

const socialLinks = [
  { icon: FaFacebookF, label: "Facebook" },
  { icon: FaGoogle, label: "Google" },
  { icon: FaInstagram, label: "Instagram" },
];

const contactInfo = [
  { icon: FaHome, text: "Praça da Independencia, N26, Centro" },
  { icon: FaEnvelope, text: "emailhefziba@exemplo.com", link: "mailto:emailhefziba@exemplo.com" },
  { icon: FaPhoneAlt, text: "+55 (73) 988279-5348" },
  { icon: FaWhatsapp, text: "+55 (73) 988279-5349" },
];

const services = [
  { img: "/barba.jpg", label: "Barba" },
  { img: "/cabelo.jpg", label: "Cabelo" },
  { img: "/outros.jpg", label: "Outros" },
];

export default function App() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      AOS.init();
    }
  }, []);

  return (
    <>
      {/* Background */}
      <section className="absolute inset-0 w-screen h-full bg-cover bg-center bg-no-repeat -z-10" style={{ backgroundImage: "url(/background.jpg)" }}>
        <div className="absolute inset-0 bg-[#03050F] bg-opacity-75" />
      </section>

      {/* Header */}
      <header className="p-4 flex items-center justify-between" data-aos="fade-zoom-in" data-aos-delay="200">
        <h1 className="text-4xl tracking-[10px] font-bold text-white">HEFZIBA</h1>
        <nav className="flex items-center justify-end mr-20">
          <ul className="flex gap-5 text-white">
            {["Início", "Serviços", "Contato"].map((item) => (
              <li key={item} className="hover:text-orange-700 cursor-pointer transition-all hover:scale-110">{item}</li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="text-center text-white relative z-10 mt-[10%]" data-aos="fade-zoom-in" data-aos-delay="200">
        <h1 className="text-6xl font-semibold tracking-[2px]">Frase De Efeito Legal Aqui!</h1>
        <p className="mt-5 max-w-4xl mx-auto tracking-[3px] font-light text-sm">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus arcu nibh, sodales in lectus a, interdum aliquet nisi.
        </p>
        <Link href="/agendar">
          <button className="mt-10 p-3 border-2 rounded-md border-orange-700 w-52 shadow-lg shadow-orange-500/20 hover:bg-gradient-to-r hover:from-orange-700 hover:to-red-500 hover:scale-105 transition-all duration-300">
            AGENDAR
          </button>
        </Link>
      </div>

      {/* Sobre */}
      <div className="flex items-center justify-between">
        <div className="max-w-[52rem] text-white p-12">
          <h1 className="text-6xl font-semibold mb-4 tracking-[4px] mt-[35rem]" data-aos="fade-right" data-aos-delay="300">Barbearia Hefziba</h1>
          <p className="text-4xl font-semibold tracking-[4px]" data-aos="fade-right" data-aos-delay="300">desde 2020</p>
          <p className="text-sm font-light max-w-[36rem] tracking-[3px] mb-6" data-aos="fade-right" data-aos-delay="300">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus arcu nibh, sodales in lectus a, interdum aliquet nisi.
          </p>
          <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-lg hover:scale-105 transition-transform duration-300" data-aos="fade-right" data-aos-delay="300">
            Saiba Mais
          </button>
        </div>
        <img src="/first.jpg" className="h-[44rem] w-[52rem] object-cover rounded-lg mt-[32rem] p-20" alt="Barbearia" data-aos="fade-left" data-aos-delay="300" />
      </div>

      {/* Serviços */}
      <div className="text-center mt-12" data-aos="fade-right" data-aos-delay="300">
        <h1 className="text-4xl font-semibold tracking-[4px] border-b w-48 mx-auto">Serviços</h1>
      </div>
      <div className="flex justify-center gap-6 p-6 mt-24">
        {services.map(({ img, label }) => (
          <div key={label} className="relative w-80 h-96 rounded-lg overflow-hidden cursor-pointer" data-aos="fade-zoom-in" data-aos-delay="200">
            <img src={img} alt={label} className="w-full h-full object-cover brightness-75 hover:brightness-100 transition" />
            <span className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-lg font-semibold">{label}</span>
          </div>
        ))}
      </div>
      <div className="text-center mt-12">
        <button className="p-3 border-2 rounded-md border-orange-700 w-52 shadow-lg hover:bg-gradient-to-r hover:from-orange-700 hover:to-red-500 hover:scale-105 transition-all duration-300">
          AGENDAR AGORA
        </button>
      </div>

      {/* Footer */}
      <footer className="bg-[#1F2122] w-full h-2/5 mt-20 flex justify-start gap-52 p-6 items-start">
        <div className="p-12" data-aos="fade-right" data-aos-delay="300">
          <h1 className="text-2xl font-semibold tracking-[2px] border-b w-72 border-slate-700">BARBEARIA HEFZIBA</h1>
          <p className="tracking-[2px] w-80 pt-8 text-sm font-light text-white/60">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </p>
        </div>
        <div className="p-12" data-aos="fade-right" data-aos-delay="300">
          <h1 className="text-2xl font-semibold tracking-[2px] border-b w-72 border-slate-700">SOCIAL</h1>
          <ul className="flex flex-col gap-y-4 pt-8">
            {socialLinks.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-x-2">
                <Icon className="text-2xl" /> <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-12" data-aos="fade-right" data-aos-delay="300">
          <h1 className="text-2xl font-semibold tracking-[2px] border-b w-72 border-slate-700">CONTATO</h1>
          <ul className="flex flex-col gap-y-4 pt-8">
            {contactInfo.map(({ icon: Icon, text, link }) => (
              <li key={text} className="flex items-center gap-x-3">
                <Icon className="text-2xl" /> {link ? <a href={link} className="underline">{text}</a> : text}
              </li>
            ))}
          </ul>
        </div>
      </footer>

      {/* Rodapé */}
      <div className="bg-[#121213] text-center py-4">
        <p className="text-white text-sm">© 2020 Copyright: Barbearia Hefziba</p>
      </div>
    </>
  );
}
