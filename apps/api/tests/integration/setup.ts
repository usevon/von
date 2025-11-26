import { secrets } from "bun"

// Only run setup if we're actually running integration tests
const isIntegrationTest = process.argv.some(arg => arg.includes("integration"))

// Load API key synchronously at module load time (before test files load)
if (isIntegrationTest && !process.env.VON_API_KEY) {
  // Check if already saved in OS keychain
  const saved = await secrets.get({ service: "von", name: "VON_API_KEY" })

  if (saved) {
    process.env.VON_API_KEY = saved
  } else {
    // First time setup - prompt user
    console.log("\nNo API key found for integration tests")
    const key = prompt("Enter your VON_API_KEY (or press Enter to skip):")?.trim()

    if (key) {
      await secrets.set({ service: "von", name: "VON_API_KEY", value: key })
      process.env.VON_API_KEY = key
      console.log("Saved to OS keychain\n")
    }
  }
}

export const getApiKey = () => process.env.VON_API_KEY
