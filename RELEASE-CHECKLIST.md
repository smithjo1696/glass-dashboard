# Release review

## Completed locally

- Neutral, integration-free starting configuration and generic mapping example.
- Appearance, navigation, background, optional module and portable preference controls.
- Native HA 2026.10.2 configuration/resource check on an isolated fresh container.
- Browser-fixture checks for setup, native shell restoration, missing integrations and phone-sized scrolling.
- Static manifest/syntax checks and import validation, including the maximum mapping count.
- Draft MIT license, contribution/privacy guidance and least-privilege validation workflow.
- Local source repository and checksummed preview archive.
- Standalone distribution bundle, HACS metadata, manual single-file instructions and source/bundle parity checks.

## Before a public stable release

- Render every view in an authenticated native HA frontend, with and without optional integrations.
- Test on physical iPhone/iPad and Android devices, including orientation changes, safe areas and scrolling.
- Exercise image selection/upload/apply/cancel and storage backup/restore on the target device.
- Confirm recovery URL and return from native administration on those devices.
- Review license and release metadata before each release.
- Review the archive and checksums; publish as a preview until native/device validation is complete.
- Run the GitHub validation workflow after creating a repository; the prepared workflow has not run remotely yet.

## Native VM test status

Authenticated native frontend testing is now complete on a fresh user-authorized HAOS VM with synthetic data. See VALIDATION.json. Physical-device checks remain pending. The 0.1.5 lazy-registration fix passed a fresh authenticated native frontend check and its targeted regression test.

## Create an archive

Run `python tests/build_bundle.py`, `python tests/validate.py`, `node tests/portable.cjs`, then `python tests/package.py --version 0.1.5`. The archive is written outside the repository. Git metadata, runtime directories and `.local.json` files are excluded. No automatic publication is performed. HACS installs the built JavaScript, not the dashboard configuration; a real HACS installation check remains pending.
