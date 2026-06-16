# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-06-16

### Fixed
- Salary parser no longer multiplies bare sub-1000 numbers by 1000 (e.g. `$120-$150` is no longer read as `$120k-$150k`); the ×1000 scaling applies only when the matched amount carries a `k`.
- `daysBack` now excludes jobs with a missing or invalid date instead of silently keeping them, so scheduled runs don't re-emit undated jobs.
- A thrown detail-fetch error now stores the job's basic data instead of silently dropping the job.
- A malformed board URL is skipped instead of aborting the whole run.
- Department filter accepts string IDs (e.g. `"307170"`), not just integers.

### Changed
- `publishedAt` is normalized to ISO 8601 (UTC).
- Output records have a consistent key set (removed the stray `departments` array that only appeared on detail-fetch-fallback rows).
- All HTTP requests now have a 30-second timeout.
- The run fails if every board errors and nothing is stored (a legitimately empty filtered result still succeeds).

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
