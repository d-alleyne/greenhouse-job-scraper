# Deployment Guide

## Step 1: Get Your Apify API Token

1. Go to https://console.apify.com/account/integrations
2. Find your API token or create a new one
3. Copy it

## Step 2: Login to Apify CLI

```bash
cd ~/projects/greenhouse-job-scraper-custom
npx apify-cli login --token YOUR_API_TOKEN_HERE
```

## Step 3: Push the Actor to Apify

```bash
npx apify-cli push
```

This will:
- Build the Actor
- Upload it to your Apify account  
- Make it available for use

## Step 4: Test the Actor

### Via Apify Console

1. Go to https://console.apify.com/actors
2. Find "greenhouse-job-scraper"
3. Click on it
4. Add this input:

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

5. Click "Save & Start"
6. Wait for it to finish
7. Check the Dataset tab for results

### Via API (for use in global-dev-flow)

Once published, you can use it in your global-dev-flow project:

```javascript
const ApifyClient = require('apify-client');

const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

const run = await client.actor('dalleyne/greenhouse-job-scraper').call({
    urls: [
        { url: 'https://job-boards.greenhouse.io/webflow?departments[]=59798' }
    ],
    proxy: {
        useApifyProxy: true
    }
});

const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(items); // Array of jobs
```

## Step 5: Update global-dev-flow

In your global-dev-flow project, update the Apify Actor ID to use your custom one instead of BytePulse Labs':

Replace: `bytepulselabs/greenhouse-job-scraper`  
With: `dalleyne/greenhouse-job-scraper`

## Monetization (Optional)

If you want to make this a paid Actor:

1. Go to your Actor settings in Apify Console
2. Change visibility to "Public"
3. Set up pricing (e.g., Pay-per-result like BytePulse Labs)
4. Submit for Apify Store listing

---

## Troubleshooting

### "Actor not found"
- Make sure you've run `apify push` successfully
- Check your username in the Actor ID

### "No jobs returned"
- Verify the department ID is correct
- Check that the Greenhouse board URL is valid
- Look at the run logs in Apify Console

### "API token invalid"
- Regenerate your token at https://console.apify.com/account/integrations
- Run `apify login` again

---

Need help? Check the Apify docs: https://docs.apify.com/cli
