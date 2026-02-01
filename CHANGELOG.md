# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.4.0] - 2026-02-01

### Added

- Detailed analytics section on link detail page (views, devices, browsers, geo, recent views)
- Detailed analytics section on photo detail page
- Responsive card layout for analytics recent views on mobile
- Responsive card layout for recent activity on mobile
- Responsive card layout for photo table on mobile

### Changed

- Per-link stats rows click through to link detail page
- Dashboard recent activity rows click through to link details
- Hide link title in per-link stats table on mobile

## [0.3.0] - 2026-02-01

### Added

- Photo detail pages with stats columns in photos table
- Column sorting on admin links, photos, and analytics dashboard tables
- Device and browser columns in dashboard recent activity
- Link titles and photo previews on analytics page
- Screenshots on about page and README

### Changed

- Default photos page to table view, persist view preference in URL param
- Table rows clickable for navigation, code column copies share URL
- Use browser history for all back buttons
- Sort expires column soonest-first by default
- Sort analytics link dropdown by creation date instead of views
- Hide per-link stats when individual link selected

### Fixed

- Admin sidebar stays visible while scrolling

### Removed

- Lightbox component from share gallery

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

[0.4.0]: https://github.com/james-langridge/glimpse/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/james-langridge/glimpse/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/james-langridge/glimpse/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/james-langridge/glimpse/releases/tag/v0.1.0
