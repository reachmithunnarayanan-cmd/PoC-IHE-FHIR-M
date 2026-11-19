# Shared-hosting deployment package

This folder contains the **currently implemented Secure Data Exchange Workstation field-configuration prototype**. It is a static browser application and can be deployed on Hostinger Premium or a typical BigRock Linux shared-hosting account.

It is **not yet the complete three-portal i-Dhanwantri / Secure Data Exchange Workstation / Dhanwantri 3.0 ADN PoC**. The other two portals, connected import/export workflow, server-side profiles, persistent audit store, and production identity controls are not implemented by this package.

## Contents

- `index.html` — standalone workstation prototype (includes CSS and JavaScript).
- `.htaccess` — Apache directory and basic response-header settings.

## Requirements

- Linux shared hosting with Apache/LiteSpeed-compatible `.htaccess` support.
- A domain or subdomain pointed at the hosting account.
- HTTPS enabled for the domain.
- No Node.js, PHP, Composer, database, or build step is required for this static prototype.

## Hostinger primary deployment

1. Create a subdomain for the demonstration, for example `workstation.example.com`, or use a dedicated directory under the domain.
2. Point its document root to a new, empty directory (recommended: `public_html/workstation`).
3. Enable an SSL certificate and force HTTPS using the hosting control panel.
4. Upload the contents of this folder—not the enclosing folder—to the document root. Ensure `index.html` and `.htaccess` are directly inside it.
5. Visit the HTTPS URL in a private/incognito browser window.
6. Test both direction tabs, search, group and field selection, locked exclusions, Apply, Save, and Restore defaults.
7. Record the final URL and keep a local copy of the exact uploaded files.

## BigRock standby deployment

1. Create the corresponding subdomain/directory in BigRock.
2. Enable HTTPS and upload the same contents.
3. Run the same smoke test independently.
4. Keep the standby URL documented. Do not depend on DNS changes or propagation during the committee demonstration.

## Updating the prototype

Replace `index.html` with the newer version from this folder, then hard-refresh the browser. Keep a dated copy of the previous version for rollback. The profile currently saves in browser-local storage; browser storage is not synchronised between devices or hosting providers.

## Demonstration safety and limitations

- Use synthetic data only. Do not enter real patient, personnel, operational, or classified information.
- The current panel is a front-end interaction prototype. Client-side checkboxes are not a security boundary.
- Saved profiles are local to the browser. There is no server-side authentication, authorisation, database persistence, package generation, cryptographic sanitisation, or durable audit trail in this static release.
- The displayed locked exclusions are illustrative PoC defaults, not an approved operational sanitisation policy.
- Hosting the three visual portals on one shared-hosting account would not create security or domain segregation.

## Pre-demo checklist

- [ ] HTTPS works and browser shows a valid certificate.
- [ ] Correct `index.html` is present at the document root.
- [ ] No directory listing is exposed.
- [ ] Test on the actual presentation laptop and browser.
- [ ] Test Hostinger primary URL and BigRock standby URL separately.
- [ ] Keep a local offline copy of this deployment folder.
- [ ] Use only synthetic data.
- [ ] Rehearse the full interaction path; this release demonstrates field configuration only.

## Rollback

Keep the previous `index.html` as a dated local backup. If the new version fails, upload the previous file back to the same document root and hard-refresh the browser.
