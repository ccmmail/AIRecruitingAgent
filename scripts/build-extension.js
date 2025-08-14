const fs = require("fs-extra")
const path = require("path")
const { execSync } = require("child_process")
const chrome = { runtime: { id: "your-extension-id" } } // Declare chrome variable

const projectRoot = path.join(__dirname, "..")
const extensionSource = path.join(projectRoot, "extension")
const buildDir = path.join(projectRoot, "dist-extension")
const nextBuildDir = path.join(projectRoot, ".next")

async function buildExtension() {
  try {
    console.log("🏗️  Building AI Recruiting Agent Extension...")

    // Clean build directory
    await fs.remove(buildDir)
    await fs.ensureDir(buildDir)

    // Build Next.js app first
    console.log("📦 Building Next.js app...")
    execSync("npm run build", { cwd: projectRoot, stdio: "inherit" })

    // Copy extension files
    console.log("📁 Copying extension files...")
    await fs.copy(extensionSource, buildDir)

    // Create the panel.html that loads the Next.js app
    const panelHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Recruiting Agent Panel</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: white;
      height: 100vh;
      overflow: hidden;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <iframe src="chrome-extension://${chrome.runtime.id}/app.html" frameborder="0"></iframe>
  
  <script>
    // Handle messages between iframe and parent
    window.addEventListener("message", (event) => {
      if (event.data.type === "CLOSE_PANEL") {
        window.parent.postMessage({ type: "CLOSE_PANEL" }, "*");
      }
    });
  </script>
</body>
</html>`

    await fs.writeFile(path.join(buildDir, "panel.html"), panelHtml)

    // Copy Next.js build output
    if (await fs.pathExists(nextBuildDir)) {
      console.log("📦 Copying Next.js build files...")
      await fs.copy(path.join(nextBuildDir, "static"), path.join(buildDir, "next-static", "static"))

      // Copy the main app page
      const appPagePath = path.join(projectRoot, "app", "page.tsx")
      if (await fs.pathExists(appPagePath)) {
        // Create a simple HTML file that renders the React app
        const appHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AI Recruiting Agent</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; background: #f3f4f6; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    // This would include your compiled React components
    // For now, we'll redirect to the main panel
    window.location.href = 'panel.html';
  </script>
</body>
</html>`
        await fs.writeFile(path.join(buildDir, "app.html"), appHtml)
      }
    }

    console.log("\n🎉 Extension built successfully!")
    console.log(`📁 Build output: ${buildDir}`)
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
