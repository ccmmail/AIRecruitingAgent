'use client'
import Component from '@/extension-panel'

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-3xl px-4">
        <Component />
      </div>
    </div>
  )
}