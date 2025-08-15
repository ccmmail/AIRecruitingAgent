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

      // Create panel.html that loads the full Next.js app
      const panelHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Recruiting Agent Panel</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: white;
      height: 100vh;
      overflow: hidden;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
  </style>
</head>
<body>
  <iframe src="app/index.html" frameborder="0" allow="clipboard-read; clipboard-write"></iframe>
  
  <script>
    // Handle messages between iframe and parent for extension communication
    window.addEventListener("message", (event) => {
      if (event.data.type === "CLOSE_PANEL") {
        chrome.sidePanel.setOptions({ enabled: false });
      }
      if (event.data.type === "RESIZE_PANEL") {
        // Handle panel resizing if needed
      }
    });

    // Inject extension context into iframe
    const iframe = document.querySelector('iframe');
    iframe.onload = function() {
      try {
        // Pass extension context to the app
        iframe.contentWindow.postMessage({
          type: 'EXTENSION_CONTEXT',
          isExtension: true,
          chrome: !!window.chrome?.extension
        }, '*');
      } catch (e) {
        console.log('[Extension] Could not inject context:', e);
      }
    };
  </script>
</body>
</html>`

      await fs.writeFile(path.join(buildDir, "panel.html"), panelHtml)

      // Update manifest to include all static assets
      const manifestPath = path.join(buildDir, "manifest.json")
      if (await fs.pathExists(manifestPath)) {
        const manifest = await fs.readJson(manifestPath)

        // Update web_accessible_resources to include all app files
        manifest.web_accessible_resources = [
          {
            resources: ["panel.html", "app/*", "app/**/*"],
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
