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

```json
{
  "urls": [
    { 
      "url": "https://job-boards.greenhouse.io/webflow",
      "departments": [59798, 59799],
      "maxJobs": 20
    },
    {
      "url": "https://job-boards.greenhouse.io/stripe",
      "maxJobs": 10
    }
  ],
  "proxy": {
    "useApifyProxy": true
  }
}
```

### Parameters

- **urls** (required): Array of job board configurations. Each object supports:
  - `url` (required): Clean Greenhouse job board URL (no query params needed)
  - `departments` (optional): Array of department IDs to filter (e.g., `[59798, 59799]`)
  - `maxJobs` (optional): Maximum number of jobs to scrape from this board
- **proxy** (optional): Proxy configuration. Defaults to using Apify proxy.

### How to Find Department IDs

1. Visit the company's Greenhouse job board (e.g., `https://job-boards.greenhouse.io/webflow`)
2. Click on a department filter (e.g., "Engineering")
3. Look at the URL bar — you'll see something like: `?departments[]=59798`
4. The number (`59798`) is the department ID
5. Use that ID in your input: `"departments": [59798]`

### Examples

**Scrape all jobs from a single company:**
```json
{
  "urls": [
    { "url": "https://job-boards.greenhouse.io/webflow" }
  ]
}
```

**Scrape specific departments only:**
```json
{
  "urls": [
    { 
      "url": "https://job-boards.greenhouse.io/webflow",
      "departments": [59798, 59800]
    }
  ]
}
```

**Multi-company with different filters:**
```json
{
  "urls": [
    { 
      "url": "https://job-boards.greenhouse.io/webflow",
      "departments": [59798],
      "maxJobs": 20
    },
    { 
      "url": "https://job-boards.greenhouse.io/stripe",
      "maxJobs": 10
    },
    { 
      "url": "https://job-boards.greenhouse.io/notion",
      "departments": [12345, 67890],
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
  "company": "webflow",
  "type": "Full-time",
  "title": "Account Executive, EMEA",
  "description": "<p>Job description HTML...</p>",
  
  "location": "CA Remote (BC & ON only), International Remote, U.S. Remote",
  "locations": ["CA Remote (BC & ON only)", "International Remote", "U.S. Remote"],
  "isRemote": true,
  "isHybrid": false,
  
  "salary": {
    "min": 80000,
    "max": 120000,
    "currency": "USD",
    "raw": "$80k - $120k"
  },
  
  "department": "Sales",
  "departments": ["Sales"],
  
  "metadata": {
    "Employment Type": "Full-time",
    "Experience Level": "Mid-Senior level"
  },
  
  "postingUrl": "https://job-boards.greenhouse.io/webflow/jobs/6860572",
  "applyUrl": "https://job-boards.greenhouse.io/webflow/jobs/6860572",
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
- `salary` (object|null) - Basic regex extraction for USD patterns like "$80k - $120k"
  - Only catches simple formats; complex salary descriptions should be parsed with LLM locally
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
        "url": "https://job-boards.greenhouse.io/webflow",
        "departments": [59798]
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
echo '{"urls":[{"url":"https://job-boards.greenhouse.io/webflow","departments":[59798]}]}' > ./apify_storage/key_value_stores/default/INPUT.json

# Run the actor
npm start

# Check results
cat ./apify_storage/datasets/default/*.json
```

## How It Works

1. Parses Greenhouse job board URLs and extracts the board token (e.g., "webflow")
2. Fetches departments via Greenhouse's public API: `https://boards-api.greenhouse.io/v1/boards/{token}/departments`
3. Filters by department IDs if specified in the input
4. For each job, fetches full details including description and metadata
5. Parses enhanced fields (salary, location array, remote/hybrid flags)
6. Saves results to the dataset

## License

MIT

## Author

Built by [Damien Alleyne](https://alleyne.dev)
