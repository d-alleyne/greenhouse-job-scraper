# Greenhouse Job Scraper (Custom)

A custom Apify Actor that scrapes Greenhouse job boards with **department filtering support**.

## Features

- ✅ Scrape job listings from any Greenhouse job board
- ✅ **Filter by department** using URL parameters (e.g., `?departments[]=59798`)
- ✅ Export data in JSON, CSV, XML, Excel, or HTML
- ✅ Same output format as the official BytePulse Labs actor
- ✅ Built with Apify SDK and Crawlee

## Why This Exists

The official [BytePulse Labs Greenhouse Job Scraper](https://apify.com/bytepulselabs/greenhouse-job-scraper) doesn't support filtering by department, even though Greenhouse's URLs support it. This custom actor fills that gap.

## Input

```json
{
  "urls": [
    { "url": "https://job-boards.greenhouse.io/webflow?departments[]=59798" }
  ],
  "proxy": {
    "useApifyProxy": true
  }
}
```

### Parameters

- **urls** (required): Array of Greenhouse job board URLs. You can include department filters in the URL.
- **proxy** (optional): Proxy configuration. Defaults to using Apify proxy.

## Output

Each job listing includes:

```json
{
  "id": 6860572,
  "type": "Full-time",
  "title": "Account Executive, EMEA",
  "description": "<p>Job description HTML...</p>",
  "locations": ["CA Remote (BC & ON only)", "International Remote"],
  "departments": ["Sales"],
  "department": "Sales",
  "postingUrl": "https://job-boards.greenhouse.io/webflow/jobs/6860572",
  "applyUrl": "https://job-boards.greenhouse.io/webflow/jobs/6860572",
  "publishedAt": "2025-05-07T01:08:03.000Z"
}
```

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
curl -X POST https://api.apify.com/v2/acts/YOUR_USERNAME~greenhouse-job-scraper-custom/runs \
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

Built by Damien Alleyne for personal use and potential passive income 🚀
