# Greenhouse Job Scraper & API

[![Apify Actor](https://img.shields.io/badge/Apify-Actor-blue)](https://apify.com/dalleyne/greenhouse-job-scraper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Scrape Greenhouse ATS job boards via API and get clean, structured job data with **department filtering applied before anything is stored**. Pull live roles from Automattic, GitLab, Speechify, and thousands of other Greenhouse-hosted career sites. No browser, no HTML parsing, 100% open source. Built for job boards, AI agents, and hiring research.

## What can Greenhouse Job Scraper & API do?

- ✅ Scrape job listings from any Greenhouse job board
- ✅ **Filter by department before storing**, so you only pay for jobs you keep
- ✅ **Filter by recency** (`daysBack`) for scheduled, incremental scraping
- ✅ **Limit results** per board with `maxJobs`
- ✅ Enhanced fields: multi-currency salary parsing, location arrays, remote/hybrid detection
- ✅ Export data in JSON, CSV, XML, Excel, or HTML
- ✅ 98%+ run success rate (the live stat is visible right on this page)
- ✅ 100% open source (MIT). Audit the code on [GitHub](https://github.com/d-alleyne/greenhouse-job-scraper)

## Why filtering before storing saves you money

Most Greenhouse scrapers fetch every job on a board and leave the filtering to you. You pay for Sales, HR, and Support listings you never wanted.

This actor uses Greenhouse's department API to filter first. A typical mid-size board lists 300+ jobs across all departments. If you only want Engineering:

| Approach | Jobs stored | Cost per board |
|----------|------------|----------------|
| Fetch-everything scraper at $0.99/1,000 | 300 | ~$0.30, plus your own filtering work |
| This scraper at $2.00/1,000 with `departments` set | ~20 | ~$0.04, already clean |

The headline price is higher. The cost per **relevant** job is typically 5 to 15 times lower, and your dataset arrives ready to use.

## Pricing

**$2.00 per 1,000 results**, pay per event. You are only charged for jobs that survive your filters, not for everything the board lists.

- 50 jobs = $0.10
- 500 jobs = $1.00
- 5,000 jobs = $10.00

## Input

### Simple Example

```json
{
  "urls": [
    { "url": "https://job-boards.greenhouse.io/automatticcareers" },
    { "url": "https://job-boards.greenhouse.io/gitlab" }
  ]
}
```

### With Filters (Per-Board)

Each URL can have its own filters:

```json
{
  "urls": [
    {
      "url": "https://job-boards.greenhouse.io/automatticcareers",
      "departments": [307170],
      "maxJobs": 20,
      "daysBack": 7
    },
    {
      "url": "https://job-boards.greenhouse.io/gitlab",
      "maxJobs": 10
    }
  ]
}
```

### Parameters

- **urls** (required): Array of job board configurations. Each object supports:
  - `url` (required): Clean Greenhouse job board URL (no query params needed)
  - `departments` (optional): Array of department IDs to filter (e.g., `[307170, 307172]`)
  - `maxJobs` (optional): Maximum number of jobs to scrape from this board
  - `daysBack` (optional): Only fetch jobs updated in the last N days (e.g., `7` for last week)
- **proxy** (optional): Proxy configuration. Defaults to Apify proxy

### How to Find Department IDs

1. Visit the company's Greenhouse job board (e.g., `https://job-boards.greenhouse.io/automatticcareers`)
2. Click on a department filter (e.g., "Code Wrangling" or "Account Executive")
3. Look at the URL bar. You'll see something like: `?departments[]=59798`
4. The number (`59798`) is the department ID
5. Use that ID in your input: `"departments": [59798]`

### Scheduled Runs

Keeping a board fresh is two parts that work together:

1. **A Schedule sets *when* the actor runs.** In Apify Console, open **Schedules → Create new**, add this actor (or a saved task with your input), and give it a cron expression. Weekly Monday 6am is `0 6 * * 1`; Monday and Thursday is `0 6 * * 1,4`. The schedule is what makes runs recur — the input JSON alone does not.
2. **`daysBack` sets *how far back* each run looks**, filtering jobs by their `updated_at` timestamp. Match it to your cron cadence so each run picks up everything new since the last one without re-storing old jobs: a weekly cron pairs with `daysBack: 7`, a twice-weekly cron with `daysBack: 4`. You only pay for jobs that pass the filter.

**Input for a weekly schedule (`0 6 * * 1`):**
```json
{
  "urls": [
    {
      "url": "https://job-boards.greenhouse.io/automatticcareers",
      "departments": [307170],
      "daysBack": 7
    }
  ]
}
```

**Input for a twice-weekly schedule (`0 6 * * 1,4`):**
```json
{
  "urls": [
    {
      "url": "https://job-boards.greenhouse.io/automatticcareers",
      "departments": [307170],
      "daysBack": 4
    }
  ]
}
```

Tip: set `daysBack` one or two days longer than your cron gap (e.g. `daysBack: 9` on a weekly cron) so a delayed or skipped run doesn't leave a gap in coverage. Duplicates across runs are expected — dedupe on the `id` field downstream.

### Multiple companies with different filters

```json
{
  "urls": [
    {
      "url": "https://job-boards.greenhouse.io/automatticcareers",
      "departments": [307170],
      "maxJobs": 20
    },
    {
      "url": "https://job-boards.greenhouse.io/gitlab",
      "maxJobs": 10
    },
    {
      "url": "https://job-boards.greenhouse.io/shopify",
      "departments": [123, 456],
      "maxJobs": 15
    }
  ]
}
```

## Output

Each job listing includes:

```json
{
  "id": 6860572,
  "company": "automatticcareers",
  "type": "Full-time",
  "title": "Account Executive, WordPress VIP",
  "description": "<p>Job description HTML...</p>",

  "location": "Remote",
  "locations": ["Remote"],
  "isRemote": true,
  "isHybrid": false,

  "salary": {
    "min": 80000,
    "max": 120000,
    "currency": "USD",
    "raw": "$80k - $120k"
  },

  "department": "Account Executive",

  "metadata": {
    "Employment Type": "Full-time",
    "Experience Level": "Mid-Senior level"
  },

  "postingUrl": "https://job-boards.greenhouse.io/automatticcareers/jobs/6860572",
  "applyUrl": "https://job-boards.greenhouse.io/automatticcareers/jobs/6860572",
  "publishedAt": "2025-05-07T01:08:03.000Z"
}
```

### Field Descriptions

**Basic fields** (always extracted):
- `id`, `title`, `company`, `department`, `postingUrl`, `applyUrl`, `publishedAt`

**Enhanced fields** (parsed from data):
- `location` (string) - Raw location text from Greenhouse
- `locations` (array) - Parsed location list (split on commas/slashes)
- `isRemote` (boolean) - Location contains "remote"
- `isHybrid` (boolean) - Location contains "hybrid"
- `salary` (object|null) - Regex extraction for salary ranges with currency detection
  - Handles: `$110,000 - $120,000`, `£50k - £70k`, `€60,000 - €80,000`
  - Detects currency from symbol (£=GBP, €=EUR) and context for $ (USD/CAD/AUD by region)
  - Only catches range patterns; narrative descriptions should be parsed with an LLM downstream
- `metadata` (object) - All Greenhouse metadata fields (Employment Type, Experience Level, etc.)

**For LLM enhancement** (recommended downstream post-processing):
- `description` - Full HTML description for extracting tech stack, detailed requirements, timezone restrictions
- `location` - Raw string for geographic classification (US-only, EMEA, APAC, etc.)
- `salary` - May be null if salary isn't in a simple format; parse `description` for complex patterns

## Use it with AI agents

This actor works as a tool for AI agents through the [Apify MCP server](https://mcp.apify.com). Connect your agent (Claude, or any MCP-compatible framework) to the Apify MCP server and it can discover and call `dalleyne/greenhouse-job-scraper` with the same JSON input shown above. The input schema is deliberately small (one `urls` array), which keeps agent tool calls reliable.

Typical agent patterns:
- Career chatbots that answer "who is hiring engineers at Greenhouse-hosted companies this week?"
- Talent-market research pipelines that track posting volume by department
- Job board back ends that refresh listings on a schedule without scraping infrastructure

## Is it legal to scrape Greenhouse job listings?

This actor reads public job postings through Greenhouse's official public job board API, the same data anyone can see in a browser without logging in. It collects no personal data. You are responsible for how you use the data; if in doubt, review Greenhouse's terms and the rules that apply to your use case.

## How It Works

1. Parses Greenhouse job board URLs and extracts the board token (e.g., "automatticcareers")
2. Fetches departments via Greenhouse's public API: `https://boards-api.greenhouse.io/v1/boards/{token}/departments`
3. Filters by department IDs if specified in the input
4. For each remaining job, fetches full details including description and metadata
5. Parses enhanced fields (salary, location array, remote/hybrid flags)
6. Saves results to the dataset

## Usage via API

```bash
curl -X POST https://api.apify.com/v2/acts/dalleyne~greenhouse-job-scraper/runs \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      {
        "url": "https://job-boards.greenhouse.io/automatticcareers",
        "departments": [307170]
      }
    ]
  }'
```

## Run It Locally (Open Source)

The full source is on [GitHub](https://github.com/d-alleyne/greenhouse-job-scraper):

```bash
# Install dependencies
npm install

# Set up local Apify storage
export APIFY_LOCAL_STORAGE_DIR=./apify_storage

# Create input file
mkdir -p ./apify_storage/key_value_stores/default
echo '{"urls":[{"url":"https://job-boards.greenhouse.io/automatticcareers","departments":[307170]}]}' > ./apify_storage/key_value_stores/default/INPUT.json

# Run the actor
npm start

# Check results
cat ./apify_storage/datasets/default/*.json
```

## FAQ

### How much does a typical run cost?

A scheduled run pulling new engineering jobs from 6 companies typically stores 10 to 50 jobs, which costs $0.02 to $0.10. Because filtering happens before storage, board size doesn't drive your bill. Job relevance does.

### How do I keep a job board updated automatically?

Create a Schedule in Apify Console pointing at this actor, and set `daysBack` to match your cadence (7 for weekly, 4 for twice-weekly). Each run then only fetches and charges for jobs updated since your last window.

### How do I find a company's department IDs?

Click a department filter on their job board and copy the number from the URL. The [step-by-step guide](#how-to-find-department-ids) above has details.

### What if a salary isn't extracted?

The built-in parser catches range patterns in 30+ currencies' symbols (e.g., `$110,000 - $120,000`, `£50k - £70k`). Narrative compensation text is left in `description` for you to parse downstream with an LLM.

### Can AI agents run this actor?

Yes. It's callable through the Apify MCP server like any store actor, and the single-array input schema keeps tool calls simple. See [Use it with AI agents](#use-it-with-ai-agents).

### Is this actor maintained?

Yes. It powers [GlobalRemote](https://jobs.alleyne.dev), the author's own job board, twice a week. If the scraper breaks, his site breaks, so it gets fixed fast. Report anything via the Issues tab or [GitHub Issues](https://github.com/d-alleyne/greenhouse-job-scraper/issues).

## Changelog

See [CHANGELOG.md](https://github.com/d-alleyne/greenhouse-job-scraper/blob/main/CHANGELOG.md). Latest: documentation overhaul and store listing refresh (June 2026).

## Related Scrapers

Looking for other ATS platforms?

- **[Ashby Job Scraper & API](https://apify.com/dalleyne/ashby-job-scraper)** - Scrape Ashby job boards (Buffer, Zapier, RevenueCat, etc.) with team filtering and applicant location requirements

## Found this useful?

If this actor saves you money or time, a review on the store page helps other people find it. It takes 30 seconds and makes a real difference for independent developers.

## License

MIT

## Author

Built by [Damien Alleyne](https://alleyne.dev)
