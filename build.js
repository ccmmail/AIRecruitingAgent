const fs = require("fs-extra")
const path = require("path")
const chokidar = require("chokidar")

const sourceDir = __dirname
const buildDir = path.join(__dirname, "dist")

// Files to copy to the extension build
const filesToCopy = [
  "manifest.json",
  "popup.html",
  "popup.js",
  "content.js",
  "content.css",
  "background.js",
  "panel.html",
]

async function build() {
  try {
    // Clean and create build directory
    await fs.remove(buildDir)
    await fs.ensureDir(buildDir)

    // Copy files
    for (const file of filesToCopy) {
      const sourcePath = path.join(sourceDir, file)
      const destPath = path.join(buildDir, file)

      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, destPath)
        console.log(`✓ Copied ${file}`)
      } else {
        console.warn(`⚠ File not found: ${file}`)
      }
    }

    // Create assets directory for any future assets
    await fs.ensureDir(path.join(buildDir, "assets"))

    console.log("\n🎉 Extension built successfully!")
    console.log(`📁 Build output: ${buildDir}`)
    console.log("\n📋 To install in Chrome:")
    console.log("1. Open Chrome and go to chrome://extensions/")
    console.log('2. Enable "Developer mode" (top right toggle)')
    console.log('3. Click "Load unpacked" and select the dist folder')
    console.log("4. The extension should now appear in your extensions list")
  } catch (error) {
    console.error("❌ Build failed:", error)
    process.exit(1)
  }
}

// Watch mode
if (process.argv.includes("--watch")) {
  console.log("👀 Watching for changes...")

  const watcher = chokidar.watch(filesToCopy, {
    cwd: sourceDir,
    ignoreInitial: false,
  })

  watcher.on("change", (file) => {
    console.log(`📝 ${file} changed, rebuilding...`)
    build()
  })

  watcher.on("add", (file) => {
    console.log(`➕ ${file} added, rebuilding...`)
    build()
  })
} else {
  build()
}
