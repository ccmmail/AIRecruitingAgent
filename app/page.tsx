import ExtensionPanel from "../extension-panel"

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Browser Extension Demo</h1>
        <p className="text-gray-600">The JobBoost Assistant panel should appear on the right side of the screen.</p>
      </div>
      <ExtensionPanel />
    </div>
  )
}
