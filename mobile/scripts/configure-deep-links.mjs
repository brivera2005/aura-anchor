#!/usr/bin/env node
/**
 * Ensures auraanchor:// deep-link handlers exist in native projects after cap sync.
 * Run: node scripts/configure-deep-links.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(root, "..");

const SCHEME = "auraanchor";
const HOST = process.env.CAPACITOR_APP_HOST ?? "your-app.your-subdomain.workers.dev";

function patchIosInfoPlist() {
  const plistPath = join(mobileRoot, "ios/App/App/Info.plist");
  if (!existsSync(plistPath)) {
    console.warn("iOS Info.plist not found — run: npx cap add ios");
    return;
  }

  let plist = readFileSync(plistPath, "utf8");
  if (plist.includes(`<string>${SCHEME}</string>`)) {
    console.log("iOS URL scheme already configured");
    return;
  }

  const urlTypes = `
	<key>CFBundleURLTypes</key>
	<array>
		<dict>
			<key>CFBundleURLName</key>
			<string>dev.auraanchor.app</string>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>${SCHEME}</string>
			</array>
		</dict>
	</array>`;

  plist = plist.replace("</dict>\n</plist>", `${urlTypes}\n</dict>\n</plist>`);
  writeFileSync(plistPath, plist);
  console.log("Patched iOS Info.plist with URL scheme", SCHEME);
}

function patchAndroidManifest() {
  const manifestPath = join(mobileRoot, "android/app/src/main/AndroidManifest.xml");
  if (!existsSync(manifestPath)) {
    console.warn("AndroidManifest.xml not found — run: npx cap add android");
    return;
  }

  let manifest = readFileSync(manifestPath, "utf8");
  const customSchemeFilter = `<intent-filter android:autoVerify="true">
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="${SCHEME}" />
        </intent-filter>`;

  const httpsFilter = `<intent-filter android:autoVerify="true">
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="https" android:host="${HOST}" />
        </intent-filter>`;

  if (!manifest.includes(`android:scheme="${SCHEME}"`)) {
    manifest = manifest.replace(
      "</activity>",
      `            ${customSchemeFilter}\n            ${httpsFilter}\n        </activity>`
    );
    writeFileSync(manifestPath, manifest);
    console.log("Patched AndroidManifest.xml with deep links");
  } else {
    console.log("Android deep links already configured");
  }
}

patchIosInfoPlist();
patchAndroidManifest();
