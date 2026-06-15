# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-06-14

### Changed
- Refactored the scraper to loop over input URLs directly with native `fetch`, dropping the unused `CheerioCrawler`/got-scraping stack (matches the sibling Lever/Ashby actors). All scraping behavior, filters (`departments`, `daysBack`, `maxJobs`), parsing, and output fields are unchanged.

### Removed
- `crawlee` dependency (was dead weight — every HTTP call already used `fetch`).
- `playwright` dependency (was never imported). `apify` is now the only runtime dependency.
- Apify proxy handling and the `proxy` input field. The actor no longer needs `Actor.createProxyConfiguration()` or an Apify token to run.

### Fixed
- Crash under Node 24 (`http2-wrapper` ESM error "Named export 'auto' not found") that originated in the removed got-scraping stack. The actor now runs Node-version-agnostically.

## [1.1.0] - 2026-06-11

### Changed
- Documentation overhaul: pricing guide with cost-per-relevant-job comparison, FAQ, AI agent (MCP) usage section, legality note
- Store listing refresh: new title (Greenhouse Job Scraper & API), description, SEO metadata, and Automation category
- Actor metadata (`.actor/actor.json`) aligned with the new store listing

## [1.0.0] - 2026-02-02

### Added
- Initial public release
- Per-URL department filtering via Greenhouse's public departments API (filter before fetch/store)
- `daysBack` recency filter for scheduled, incremental scraping
- `maxJobs` per-board result limit
- Enhanced fields: multi-currency salary parsing, location arrays, remote/hybrid detection
- Built with Apify SDK and Crawlee
