# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-01-31

### Added

- PWA support for iOS home screen install
- Share link titles — display on admin list, detail pages, and shared photo pages
- Editable share link title from admin detail page
- Database migration for title column on existing installations
- Live expiry countdown on shared photo pages
- Grid/table view toggle with enhanced photo metadata on admin page
- Photo thumbnail previews on admin links list
- Native share button for share links
- Photo deletion on mobile via tap-to-reveal
- Configurable cleanup retention period via `CLEANUP_DAYS` environment variable
- Footer on shared photo pages
- Back navigation arrow on login page for PWA users
- Admin link on homepage footer
- GitHub link and author attribution on homepage footer
- Dockerfile for Railway cleanup cron service
- Robots.txt rules to block crawlers and AI agents
- MIT license

### Changed

- EXIF orientation applied automatically on upload
- Login link moved to top-right corner as subtle icon
- About page back links use browser history
- OG preview image replaced with static logo
- Default Next.js icons replaced with custom eye favicon
- Footer consolidated into single attribution line

### Fixed

- Homepage overflow on mobile using dvh and flexbox layout

### Removed

- Unused default Next.js SVG assets

## [0.1.0] - 2025-06-15

Initial public release.

[0.2.0]: https://github.com/james-langridge/glimpse/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/james-langridge/glimpse/releases/tag/v0.1.0
