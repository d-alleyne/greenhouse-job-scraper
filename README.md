# Greenhouse Job Scraper

[![Apify Actor](https://img.shields.io/badge/Apify-Actor-blue)](https://apify.com/dalleyne/greenhouse-job-scraper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An **open source** Apify Actor that scrapes Greenhouse job boards with **department filtering support**.

## Features

- ✅ Scrape job listings from any Greenhouse job board
- ✅ **Filter by department** using URL parameters (e.g., `?departments[]=59798`)
- ✅ Export data in JSON, CSV, XML, Excel, or HTML
- ✅ Same output format as popular Greenhouse scrapers
- ✅ Built with Apify SDK and Crawlee
- ✅ 100% open source

## Why Use This

Most Greenhouse scrapers ignore the native department filtering that Greenhouse URLs support. This actor leverages Greenhouse's department API to let you filter jobs by department ID — saving you compute costs and getting you exactly the jobs you need.

## Input

```json
{
  "urls": [
    { 
      "url": "https://job-boards.greenhouse.io/webflow?departments[]=59798",
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

- **urls** (required): Array of Greenhouse job board URLs. Each URL object supports:
  - `url` (required): Greenhouse job board URL (can include department filters)
  - `maxJobs` (optional): Maximum number of jobs to scrape from this board (useful for multi-company runs)
- **proxy** (optional): Proxy configuration. Defaults to using Apify proxy.

### How to Set `maxJobs` in Apify UI

**Option 1: Advanced Mode (Form View)**
1. Add your URL in the normal field (e.g., `https://job-boards.greenhouse.io/webflow`)
2. Click the **"Advanced"** button next to the URL
3. In the **"User data (optional)"** field, add:
   ```json
   {"maxJobs": 20}
   ```
4. Click "Set"

**Option 2: JSON Tab (Easier for Multiple URLs)**
1. Switch to the **"JSON"** tab at the top
2. Enter your configuration:
   ```json
   {
     "urls": [
       { "url": "https://job-boards.greenhouse.io/webflow", "maxJobs": 20 },
       { "url": "https://job-boards.greenhouse.io/stripe", "maxJobs": 10 }
     ]
   }
   ```

> **Recommended:** Use the JSON tab when setting `maxJobs` for multiple companies—it's cleaner and less error-prone.

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
    { "url": "https://job-boards.greenhouse.io/webflow?departments[]=59798&departments[]=59800" }
  ]
}
```

**Multi-company with different limits:**
```json
{
  "urls": [
    { "url": "https://job-boards.greenhouse.io/webflow", "maxJobs": 20 },
    { "url": "https://job-boards.greenhouse.io/stripe", "maxJobs": 10 },
    { "url": "https://job-boards.greenhouse.io/notion", "maxJobs": 15 }
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
      { "url": "https://job-boards.greenhouse.io/webflow?departments[]=59798" }
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
echo '{"urls":[{"url":"https://job-boards.greenhouse.io/webflow?departments[]=59798"}]}' > ./apify_storage/key_value_stores/default/INPUT.json

# Run the actor
npm start

# Check results
cat ./apify_storage/datasets/default/*.json
```

## How It Works

1. Parses Greenhouse job board URLs
2. Extracts the board token (e.g., "webflow")
3. Fetches jobs via Greenhouse's public API: `https://boards-api.greenhouse.io/v1/boards/{token}/jobs`
4. Filters by department IDs if present in the URL
5. Transforms and saves results to the dataset

## License

MIT

## Author

Built by [Damien Alleyne](https://alleyne.dev)
