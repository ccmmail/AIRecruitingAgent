const fs = require("fs-extra")
const path = require("path")
const { execSync } = require("child_process")

const projectRoot = path.join(__dirname, "..")
const buildDir = path.join(projectRoot, "dist-extension")
const nextOutDir = path.join(projectRoot, "out")

async function buildExtension() {
  try {
    console.log("🏗️  Building AI Recruiting Agent Extension (Full Experience)...")

    // Clean build directory
    await fs.remove(buildDir)
    await fs.ensureDir(buildDir)

    // Build Next.js app with static export
    console.log("📦 Building Next.js app with static export...")
    execSync("npm run build", { cwd: projectRoot, stdio: "inherit" })

    console.log("📁 Copying extension files from root...")
    const filesToCopy = ["manifest.json", "background.js", "content.js", "content.css"]
    for (const file of filesToCopy) {
      const sourcePath = path.join(projectRoot, file)
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, path.join(buildDir, file))
      }
    }

    // Copy the entire Next.js static export
    if (await fs.pathExists(nextOutDir)) {
      console.log("📦 Copying Next.js static files...")
      await fs.copy(nextOutDir, path.join(buildDir, "app"))

      const nextIndexPath = path.join(nextOutDir, "index.html")
      if (await fs.pathExists(nextIndexPath)) {
        let nextIndexContent = await fs.readFile(nextIndexPath, "utf8")

        const inlineScripts = []
        nextIndexContent = nextIndexContent.replace(
          /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,
          (match, content) => {
            if (content.trim()) {
              inlineScripts.push(content.trim())
            }
            return "" // Remove inline script
          },
        )

        // Fix asset paths to work in extension context
        nextIndexContent = nextIndexContent
          .replace(/href="\/_next/g, 'href="app/_next')
          .replace(/src="\/_next/g, 'src="app/_next')
          .replace(/href="\/favicon/g, 'href="app/favicon')
          .replace(/src="\/favicon/g, 'src="app/favicon')

        if (inlineScripts.length > 0) {
          const scriptContent = `
// Extension context detection
window.__EXTENSION_CONTEXT__ = {
  isExtension: true,
  chrome: !!window.chrome?.extension
};

window.__ENABLE_DEMO_MODE__ = true;

// Next.js inline scripts
${inlineScripts.join("\n\n")}
`
          await fs.writeFile(path.join(buildDir, "extension-init.js"), scriptContent)

          // Add reference to external script
          nextIndexContent = nextIndexContent.replace("</head>", `  <script src="extension-init.js"></script>\n</head>`)
        }

        nextIndexContent = nextIndexContent.replace(/<link[^>]*rel="preload"[^>]*as="font"[^>]*>/gi, "")

        // Add extension styling
        const extensionStyles = `
  <style>
    body {
      margin: 0;
      padding: 0;
      height: 100vh;
      overflow: auto;
    }
    #__next {
      height: 100vh;
    }
  </style>`

        // Insert the styles before closing head tag
        nextIndexContent = nextIndexContent.replace("</head>", `${extensionStyles}\n</head>`)

        await fs.writeFile(path.join(buildDir, "panel.html"), nextIndexContent)
      } else {
        throw new Error("Next.js index.html not found in build output")
      }

      // Update manifest to include all static assets
      const manifestPath = path.join(buildDir, "manifest.json")
      if (await fs.pathExists(manifestPath)) {
        const manifest = await fs.readJson(manifestPath)

        manifest.web_accessible_resources = [
          {
            resources: ["panel.html", "extension-init.js", "app/*", "app/**/*"],
            matches: ["<all_urls>"],
          },
        ]

        await fs.writeJson(manifestPath, manifest, { spaces: 2 })
      }
    } else {
      throw new Error("Next.js build output not found. Make sure 'npm run build' completed successfully.")
    }

    console.log("\n🎉 Full experience extension built successfully!")
    console.log(`📁 Build output: ${buildDir}`)
    console.log("✨ This build includes the complete Next.js app with:")
    console.log("   • Full React components and functionality")
    console.log("   • Tailwind CSS styling")
    console.log("   • Client-side routing")
    console.log("   • All static assets")
    console.log("   • CSP-compliant external scripts")
    console.log("   • Self-contained (except backend calls)")
    console.log("\n📋 To install in Chrome:")
    console.log("1. Open Chrome and go to chrome://extensions/")
    console.log('2. Enable "Developer mode" (top right toggle)')
    console.log('3. Click "Load unpacked" and select the dist-extension folder')
  } catch (error) {
    console.error("❌ Build failed:", error)
    process.exit(1)
  }
}

buildExtension()
