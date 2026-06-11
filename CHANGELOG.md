# Changelog

All notable changes to this project will be documented in this file.

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
