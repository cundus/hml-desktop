/**
 * Auto-increment version script
 * Run before build to increment patch version (x.y.Z -> x.y.Z+1)
 */

const fs = require('fs')
const path = require('path')

const packagePath = path.join(__dirname, '..', 'package.json')

try {
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  const currentVersion = packageJson.version

  // Parse version
  const parts = currentVersion.split('.')
  if (parts.length !== 3) {
    console.error('Invalid version format:', currentVersion)
    process.exit(1)
  }

  // Increment patch version
  const major = parseInt(parts[0], 10)
  const minor = parseInt(parts[1], 10)
  const patch = parseInt(parts[2], 10) + 1

  const newVersion = `${major}.${minor}.${patch}`

  // Update package.json
  packageJson.version = newVersion
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n')

  console.log(`✓ Version bumped: ${currentVersion} -> ${newVersion}`)
} catch (error) {
  console.error('Failed to bump version:', error.message)
  process.exit(1)
}
