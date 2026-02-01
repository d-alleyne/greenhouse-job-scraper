# Greenhouse Job Scraper

[![Apify Actor](https://img.shields.io/badge/Apify-Actor-blue)](https://apify.com/dalleyne/greenhouse-job-scraper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An **open source** Apify Actor that scrapes Greenhouse job boards with **department filtering support**.

## Features

- ✅ Scrape job listings from any Greenhouse job board
- ✅ **Filter by department** using department IDs
- ✅ **Limit results** per job board with maxJobs parameter
- ✅ Export data in JSON, CSV, XML, Excel, or HTML
- ✅ Enhanced fields: salary parsing, location arrays, remote/hybrid detection
- ✅ Built with Apify SDK and Crawlee
- ✅ 100% open source

## Why Use This

Most Greenhouse scrapers fetch all jobs and make you filter locally. This actor leverages Greenhouse's department API to filter server-side — saving you compute costs and getting you exactly the jobs you need.

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
- **proxy** (optional): Proxy configuration. Defaults to using Apify proxy

### How to Find Department IDs

1. Visit the company's Greenhouse job board (e.g., `https://job-boards.greenhouse.io/automatticcareers`)
2. Click on a department filter (e.g., "Code Wrangling" or "Account Executive")
3. Look at the URL bar — you'll see something like: `?departments[]=59798`
4. The number (`59798`) is the department ID
5. Use that ID in your input: `"departments": [59798]`

### Scheduled Runs

The `daysBack` parameter is perfect for scheduling the scraper to run regularly and only fetch new jobs:

**Weekly scraper (runs every Monday):**
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

**Twice-weekly scraper (runs Monday & Thursday):**
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

**How it works:**
- The scraper fetches all jobs from the board
- Jobs are filtered by their `updated_at` timestamp
- Only jobs updated in the last N days are returned
- **Cost savings**: You only pay for jobs that match the date filter (not all jobs)

### Examples

**Scrape all jobs from a single company:**
```json
{
  "urls": [
    { "url": "https://job-boards.greenhouse.io/automatticcareers" }
  ]
}
```

**Scrape specific departments only:**
```json
{
  "urls": [
    { 
      "url": "https://job-boards.greenhouse.io/automatticcareers",
      "departments": [307170, 307172]
    }
  ]
}
```

**Fetch only recent jobs (last 7 days):**
```json
{
  "urls": [
    { 
      "url": "https://job-boards.greenhouse.io/automatticcareers",
      "daysBack": 7
    }
  ]
}
```

**Multiple companies with different filters:**
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
  - Detects currency from symbol (£=GBP, €=EUR) and context for $ (USD/CAD/AUD/EUR by region)
  - Only catches range patterns; narrative descriptions should be parsed with LLM locally
- `metadata` (object) - All Greenhouse metadata fields (Employment Type, Experience Level, etc.)

**For LLM enhancement** (recommended local post-processing):
- `description` - Full HTML description for extracting tech stack, detailed requirements, timezone restrictions
- `location` - Raw string for geographic classification (US-only, EMEA, APAC, etc.)
- `salary` - May be null if salary isn't in simple format; parse `description` for complex patterns

## Usage

### Via Apify Console

1. Upload this actor to your Apify account
2. Open the actor
3. Add Greenhouse job board URLs (with or without department filters)
4. Run and download results

### Via Apify CLI

```bash
# Install Apify CLI
npm install -g apify-cli

# Login to Apify
apify login

# Push to Apify
apify push

# Run locally
apify run -p
```

### Via API

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

## Local Testing

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

## How It Works

1. Parses Greenhouse job board URLs and extracts the board token (e.g., "automatticcareers")
2. Fetches departments via Greenhouse's public API: `https://boards-api.greenhouse.io/v1/boards/{token}/departments`
3. Filters by department IDs if specified in the input
4. For each job, fetches full details including description and metadata
5. Parses enhanced fields (salary, location array, remote/hybrid flags)
6. Saves results to the dataset

## License

MIT

## Author

Built by [Damien Alleyne](https://alleyne.dev)
