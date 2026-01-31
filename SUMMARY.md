# Custom Greenhouse Job Scraper - Project Summary

## What I Built

An open source Apify Actor that scrapes Greenhouse job boards **with department filtering support** — a feature most Greenhouse scrapers lack.

## Key Features

✅ **Department Filtering** - Use `?departments[]=ID` in URLs to filter jobs  
✅ **Multiple Departments** - Filter by multiple department IDs  
✅ **Standard Output Format** - Compatible with common Greenhouse scraper formats  
✅ **Fast & Efficient** - Uses Greenhouse's departments API directly  
✅ **Ready for Production** - Includes error handling, logging, proxy support  
✅ **Open Source** - MIT licensed, transparent, community-driven  

## What You Get

```
greenhouse-job-scraper-custom/
├── src/main.js              # Main actor logic
├── .actor/
│   ├── actor.json           # Actor metadata
│   └── INPUT_SCHEMA.json    # Input configuration
├── Dockerfile               # Container definition
├── README.md                # Full documentation
├── DEPLOYMENT.md            # How to push to Apify
├── USAGE.md                 # Usage examples
└── package.json             # Dependencies
```

## How It Works

1. Parses Greenhouse job board URLs
2. Extracts board token (e.g., "webflow")  
3. Calls `https://boards-api.greenhouse.io/v1/boards/{token}/departments`
4. Filters departments by ID if specified in URL
5. Extracts and returns all jobs from matching departments

## Next Steps

### 1. Deploy to Apify

```bash
cd ~/projects/greenhouse-job-scraper-custom
npx apify-cli login --token YOUR_API_TOKEN
npx apify-cli push
```

See `DEPLOYMENT.md` for details.

### 2. Use in global-dev-flow

Update your actor reference:

```javascript
// With department filtering support
const actor = 'dalleyne/greenhouse-job-scraper';
```

### 3. Test It

Input:
```json
{
  "urls": [
    { "url": "https://job-boards.greenhouse.io/webflow?departments[]=59798" }
  ]
}
```

Expected: 17 Engineering jobs from Webflow

## Known Limitations

- **No job descriptions** in output (would require additional API calls per job)
- **Requires valid department IDs** (use the curl command in USAGE.md to find them)
- **Greenhouse boards only** (won't work for Lever, Ashby, etc.)

## Future Enhancements (if needed)

1. **Fetch full job descriptions** - Add optional flag to get detailed content
2. **Keyword filtering** - Filter jobs by title/description keywords
3. **Location filtering** - Filter by job location
4. **Auto-discovery** - Auto-detect all department IDs

## Monetization Potential

If you make this public on Apify Store:

- **Pricing**: $2/1000 jobs (standard market rate)
- **Market**: Anyone needing department filtering
- **Advantage**: Open source + department filtering = unique value prop

## Testing Results

✅ Webflow board: 51 total jobs, 19 departments  
✅ Engineering department (ID: 59798): 17 jobs  
✅ Sales department (ID: 65451): 18 jobs  
✅ Department filtering: Works correctly  
✅ API response time: < 1 second  

## Files Created

All files are in: `~/projects/greenhouse-job-scraper-custom`

Git repo initialized with initial commit ✅

---

**Ready to deploy!** Follow DEPLOYMENT.md to push it to Apify.

Questions? Check README.md or ping me.
