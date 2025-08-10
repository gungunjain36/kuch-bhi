'use client'

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Sparkles, X } from 'lucide-react'
import { Instrument_Serif } from 'next/font/google'
import WaitlistForm from '@/components/waitlist-form'

const instrumentSerif = Instrument_Serif({ weight: ['400'], subsets: ['latin'] })

export default function WaitlistDialog({
  trigger,
  title = 'Join the waitlist',
  description = "We'll whitelist your Google account and notify you.",
}: {
  trigger: React.ReactNode
  title?: string
  description?: string
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 p-2 focus:outline-none sm:p-0">
          {/* Card-like container with gradient header */}
          <div
            className="overflow-hidden rounded-[28px] bg-neutral-50 p-3 shadow-sm
            shadow-[rgba(17,24,28,0.08)_0_0_0_1px,rgba(17,24,28,0.08)_0_1px_2px_-1px,rgba(17,24,28,0.04)_0_2px_4px]"
          >
            {/* Gradient header inspired by cards */}
            <div
              aria-hidden
              className="relative aspect-[16/10] w-full rounded-[24px]
              bg-[radial-gradient(400px_400px_at_30%_20%,rgba(60,140,255,0.55),transparent),radial-gradient(400px_400px_at_70%_80%,rgba(100,180,255,0.45),transparent)]
              shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05),0px_1px_1px_0px_rgba(255,252,240,0.5)_inset,0px_0px_0px_1px_hsla(0,0%,100%,0.1)_inset,0px_0px_1px_0px_rgba(28,27,26,0.5)]"
            >
              <div className="absolute inset-0 rounded-[20px] bg-[radial-gradient(800px_400px_at_50%_12%,transparent,rgba(255,255,255,0.22))]" />
      
              {/* Centered headline inside gradient */}
              <div className="absolute inset-0 grid place-items-center">
                <div
                  className={`bg-gradient-to-r from-amber-400 via-sky-400 to-blue-500 bg-clip-text text-center text-2xl font-semibold tracking-tight text-white sm:text-3xl ${instrumentSerif.className}`}
                >
                  Karo sab kuch
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  aria-label="Close"
                  className="absolute right-4 top-4 inline-flex items-center justify-center rounded-md p-2 text-slate-800 hover:bg-white/60"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Body */}
            <div className="p-5">
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-slate-700">
                {description}
              </Dialog.Description>

              <div className="mt-4">
                <WaitlistForm />
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
