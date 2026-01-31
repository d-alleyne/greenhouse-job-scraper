# Usage Examples

## Testing Locally (without Apify)

If you want to iterate quickly without pushing to Apify every time:

```bash
# Create test input
mkdir -p ./apify_storage/key_value_stores/default
cat > ./apify_storage/key_value_stores/default/INPUT.json << 'EOF'
{
  "urls": [
    { "url": "https://job-boards.greenhouse.io/webflow?departments[]=59798" }
  ],
  "proxy": {
    "useApifyProxy": false
  }
}
EOF

# Run locally
APIFY_LOCAL_STORAGE_DIR=./apify_storage node src/main.js

# Check results
cat ./apify_storage/datasets/default/*.json | jq .
```

## Example URLs

### Filter by single department

```
https://job-boards.greenhouse.io/webflow?departments[]=59798
```

This will return only Engineering jobs (department ID 59798).

### Filter by multiple departments

```
https://job-boards.greenhouse.io/webflow?departments[]=59798&departments[]=65451
```

This will return Engineering (59798) + Sales (65451) jobs.

### No filter (all jobs)

```
https://job-boards.greenhouse.io/webflow
```

This will return all jobs from all departments.

## Finding Department IDs

Use this curl command to see all departments and their IDs:

```bash
curl -s 'https://boards-api.greenhouse.io/v1/boards/COMPANY/departments' | \
  jq '[.departments[] | {id, name, job_count: (.jobs | length)}] | sort_by(.job_count) | reverse'
```

Replace `COMPANY` with the board token (e.g., `webflow`, `stripe`, `github`).

### Common Webflow Departments

| ID | Name | Jobs |
|----|------|------|
| 65451 | Sales | 18 |
| 59798 | Engineering | 17 |
| 66010 | Marketing | 5 |
| 44191 | Product | 3 |
| 58498 | Customer Support | 3 |

## Using in global-dev-flow

Once deployed to Apify, update your job scraping config:

```javascript
// Your open source actor with department filtering
const actor = 'dalleyne/greenhouse-job-scraper';

// Now you can use department filters in URLs
const input = {
  urls: [
    { url: 'https://job-boards.greenhouse.io/webflow?departments[]=59798' },
    { url: 'https://job-boards.greenhouse.io/stripe?departments[]=12345' }
  ]
};
```

## Output Format

Each job will have this structure:

```json
{
  "id": 7060637,
  "type": null,
  "title": "Account Executive, EMEA (CEE)",
  "description": "",
  "locations": ["London, U.K. (Hybrid)"],
  "department": "Engineering",
  "departments": ["Engineering"],
  "postingUrl": "https://job-boards.greenhouse.io/webflow/jobs/7060637",
  "applyUrl": "https://job-boards.greenhouse.io/webflow/jobs/7060637",
  "publishedAt": "2026-01-23T11:45:43-05:00"
}
```

**Note:** The `description` field will be empty when using the departments API. To get full job descriptions, you'd need to fetch each job individually (which would increase API calls/cost). This is a tradeoff for fast department filtering.

If you need full descriptions, let me know and I can update the actor to optionally fetch them.
