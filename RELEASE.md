# Release Guide for RepoZero

This document provides step-by-step instructions for releasing RepoZero to GitHub.

## First-Time Release Setup

Before creating your first release, you need to set up code signing for the Tauri updater.

### Step 1: Generate Signing Keys

Run the following command to generate a public/private key pair:

```bash
pnpm tauri signer generate -w ~/.tauri/repo-zero.key
```

This will:
- Create a private key file at `~/.tauri/repo-zero.key`
- Display the public key in the terminal output

**IMPORTANT**: Keep the private key file secure and never commit it to version control!

### Step 2: Update Tauri Configuration

1. Copy the **public key** from the command output
2. Open `src-tauri/tauri.conf.json`
3. Find the `plugins.updater.pubkey` field (currently set to `"PLACEHOLDER_PUBKEY"`)
4. Replace `"PLACEHOLDER_PUBKEY"` with your actual public key

Example:
```json
{
  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWdu...",
      "endpoints": [...]
    }
  }
}
```

### Step 3: Configure GitHub Secrets

1. Go to your GitHub repository settings
2. Navigate to **Settings > Secrets and variables > Actions**
3. Add the following secrets:
   - **Name**: `TAURI_SIGNING_PRIVATE_KEY`
   - **Value**: Paste the contents of `~/.tauri/repo-zero.key`
   
4. (Optional) If you set a password for the key, also add:
   - **Name**: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
   - **Value**: Your key password

### Step 4: Verify Version Number

Ensure the version number is correct in all three files:
- `package.json` → `"version": "0.1.0"`
- `src-tauri/tauri.conf.json` → `"version": "0.1.0"`
- `src-tauri/Cargo.toml` → `version = "0.1.0"`

### Step 5: Create and Push Release Tag

Once everything is configured:

```bash
# Ensure all changes are committed
git status

# Create a version tag
git tag v0.1.0

# Push the tag to GitHub
git push origin v0.1.0
```

The GitHub Actions workflow will automatically:
- Build installers for Windows, Linux, and macOS
- Sign the update artifacts
- Create a GitHub Release with all installers attached
- Generate the `latest.json` file for auto-updates

---

## Subsequent Releases

For subsequent releases after the initial setup:

### 1. Update Version Numbers

Update the version in all three files:
- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

### 2. Commit Changes

```bash
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: bump version to X.Y.Z"
git push
```

### 3. Create and Push Tag

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

The release will be automatically built and published by GitHub Actions.

---

## Troubleshooting

### Build Failures

If the GitHub Actions workflow fails:
1. Check the Actions tab in your GitHub repository
2. Review the error logs for each platform
3. Common issues:
   - Missing or incorrect signing key
   - Version mismatch between config files
   - Dependency resolution errors

### macOS Code Signing

**Note**: Without an Apple Developer certificate, macOS users will see a security warning when opening the app for the first time. This is expected behavior.

To bypass the warning:
1. Right-click the app and select "Open"
2. Click "Open" in the security dialog

For production releases, consider obtaining an Apple Developer certificate for proper code signing.

### Update Detection Not Working

If the app doesn't detect updates:
1. Verify `bundle.createUpdaterArtifacts: true` is set in `tauri.conf.json`
2. Ensure the public key in `tauri.conf.json` matches your signing key
3. Check that the GitHub release includes `latest.json` file
4. Verify the endpoint URL in `tauri.conf.json` is correct:
   ```
   https://github.com/XSIJIE975/repo-zero/releases/latest/download/latest.json
   ```

---

## Release Checklist

Use this checklist for each release:

- [ ] All code changes committed and pushed
- [ ] Version numbers updated in all three files
- [ ] CHANGELOG updated (if applicable)
- [ ] Local build tested: `pnpm tauri:build`
- [ ] Tag created and pushed
- [ ] GitHub Actions workflow completed successfully
- [ ] Installers downloaded and tested on target platforms
- [ ] Previous version successfully updates to new version

---

## Additional Resources

- [Tauri v2 Updater Documentation](https://v2.tauri.app/plugin/updater/)
- [GitHub Actions for Tauri](https://github.com/tauri-apps/tauri-action)
- [Tauri Signing Guide](https://v2.tauri.app/plugin/updater/#signing-updates)
