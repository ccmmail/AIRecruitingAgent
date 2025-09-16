'use client'
import Component from '@/extension-panel'

export default function Page() {
  return (
    <div className="min-h-screen w-full">
      <main className="mx-auto w-full max-w-3xl px-4">
        <Component />
      </main>
    </div>
  )
}