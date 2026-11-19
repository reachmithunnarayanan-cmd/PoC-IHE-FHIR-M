# Shared-hosting deployment package

This folder contains the integrated **three-portal visual interoperability PoC**. It is a static browser application intended for Hostinger Premium (primary) and BigRock (standby).

## Contents

- `index.html` — i-Dhanwantri, Secure Data Exchange Workstation and Dhanwantri 3.0 ADN demo in one browser application.
- `.htaccess` — Apache/LiteSpeed-compatible directory and basic response-header settings.
- `DEPLOYMENT.md` — these deployment and rehearsal instructions.

## Hosting requirements

- Linux shared hosting with Apache/LiteSpeed-compatible `.htaccess` support.
- A domain/subdomain with HTTPS enabled.
- No Node.js, PHP, Composer, database or build step is required for this static release.

## Deploy on Hostinger (primary)

1. Create a dedicated subdomain or directory, e.g. `demo.example.com` or `public_html/demo/`.
2. Point the document root at that empty directory.
3. Enable SSL and force HTTPS in the hosting control panel.
4. Upload the contents of this folder directly into the document root. `index.html` and `.htaccess` must be at its top level.
5. Open the HTTPS URL in a private/incognito browser window.
6. Complete the smoke test below on the actual presentation laptop and browser.

## Deploy on BigRock (standby)

Repeat the same steps independently using the same release files. Test its URL before the committee presentation and keep that URL recorded. Do not depend on DNS changes or propagation during the demonstration.

## End-to-end smoke test

1. In **i-Dhanwantri**, register/update the prefilled synthetic patient and save the clinical encounter.
2. Generate and download the FHIR-inspired XML package.
3. In **Secure Data Exchange Workstation**, load the current browser-local package (or import the downloaded XML).
4. Keep the **Public → ADN** direction selected. Review field selection, apply the profile and inspect the transformation report.
5. Export the ADN-ingest JSON package.
6. In **Dhanwantri 3.0 ADN**, load the latest local package (or import the downloaded JSON).
7. Inspect imported values and their provenance. Open PME or AME, save the structured examination record, and use the print action to create a PDF via the browser print dialog.
8. Rehearse the outbound **ADN → Public** strip demonstration separately. Review the field allowlist and export the stripped XML.

## Important implementation boundaries

- The public-side package is human-readable **FHIR-inspired XML** for representation only. It is not schema-validated FHIR serialization and is not claimed to conform to an ABDM profile.
- Package hand-off is simulated through browser-local storage or manual file export/import. It is not a live cross-domain transfer.
- The three portals are distinct visual surfaces in one static application, not isolated security domains.
- The examination workspace now follows the distinct AFMSF 3A (Ver-2002) and AFMSF 3B (Ver 2002) section sequence and source-form labels, with a clean structured screen and print-friendly layout. The generated PDF is a presentation facsimile, not the official AFMSF artwork or a certified form; verify against the issuing authority's current master before any formal use.
- PDF output uses the browser print dialog and a clean AFMSF-labelled presentation template. It is not the official form artwork and is not digitally signed.
- Profiles, records and audit-like views are client-side demonstration behaviour. There is no server-side authentication, authorisation, database persistence, durable audit service, approved sanitisation engine or production identity assurance.
- The workstation's field rules are illustrative PoC defaults, not an approved operational sanitisation policy.
- Use synthetic data only. Never enter real patient, personnel, operational or classified information.

## Pre-demo checklist

- [ ] HTTPS works and certificate is valid.
- [ ] Correct `index.html` is in the document root.
- [ ] Hostinger primary URL tested end-to-end.
- [ ] BigRock standby URL tested end-to-end.
- [ ] Browser pop-ups allowed for the PDF print action.
- [ ] Downloaded XML and JSON file import paths tested.
- [ ] Presentation laptop has a local copy of the deployment folder.
- [ ] Demo reset and full replay rehearsed.
- [ ] Only synthetic data is used.

## Update and rollback

Keep a dated backup of the currently deployed `index.html`. To update, upload the new `index.html` from this folder and hard-refresh the browser. If the release fails, restore the dated backup.
