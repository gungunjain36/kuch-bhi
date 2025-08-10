"use client"

import { TextScroll } from "@/components/ui/text-scroll"
import { Instrument_Serif } from "next/font/google"

const instrumentSerif = Instrument_Serif({
  weight: ["400"],
  subsets: ["latin"],
})

export default function Footer() {
  return (
    <footer className="relative mt-8 border-t border-white/50 bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <h2 className="sr-only">Footer marquee</h2>
        <TextScroll
          text="Kuch Bhi"
          default_velocity={3}
          className={`${instrumentSerif.className} text-3xl font-semibold tracking-tight text-slate-900 md:text-6xl md:leading-[4.25rem]`}
        />
      </div>
    </footer>
  )
}
