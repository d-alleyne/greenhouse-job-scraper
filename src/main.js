import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';

await Actor.init();

const input = await Actor.getInput() || {};
const { urls = [], proxy = { useApifyProxy: true } } = input;

if (!urls || urls.length === 0) {
    throw new Error('No URLs provided. Please add at least one Greenhouse job board URL.');
}

const proxyConfiguration = proxy.useApifyProxy
    ? await Actor.createProxyConfiguration()
    : undefined;

const crawler = new CheerioCrawler({
    proxyConfiguration,
    maxRequestsPerCrawl: 1000,
    async requestHandler({ request, $, log }) {
        const url = new URL(request.url);
        
        // Extract board token from URL (e.g., "webflow" from job-boards.greenhouse.io/webflow)
        const boardToken = url.pathname.split('/')[1];
        
        if (!boardToken) {
            log.error(`Could not extract board token from URL: ${request.url}`);
            return;
        }

        // Build the API URL - use departments endpoint to get jobs organized by department
        const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/departments`;
        
        // Parse department filters from URL if present (e.g., ?departments[]=59798)
        const departmentIds = url.searchParams.getAll('departments[]');
        const departmentIdNumbers = departmentIds.map(id => parseInt(id, 10));
        
        log.info(`Fetching jobs from ${boardToken}`, { departmentIds });

        try {
            // Fetch departments and their jobs from Greenhouse API
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            let departments = data.departments || [];

            log.info(`Found ${departments.length} departments`);

            // Filter departments if specified
            if (departmentIdNumbers.length > 0) {
                departments = departments.filter(dept => departmentIdNumbers.includes(dept.id));
                log.info(`Filtered to ${departments.length} departments matching IDs: ${departmentIds.join(', ')}`);
            }

            // Extract and save all jobs from the (filtered) departments
            let totalJobs = 0;
            for (const department of departments) {
                const jobs = department.jobs || [];
                
                for (const job of jobs) {
                    const jobData = {
                        id: job.id,
                        type: job.metadata?.find(m => m.name === 'Employment Type')?.value || null,
                        title: job.title,
                        description: job.content || '',
                        locations: job.location?.name ? [job.location.name] : [],
                        department: department.name,
                        departments: [department.name], // Job belongs to this department
                        postingUrl: job.absolute_url,
                        applyUrl: job.absolute_url,
                        publishedAt: job.updated_at,
                    };

                    await Actor.pushData(jobData);
                    totalJobs++;
                }
            }

            log.info(`Saved ${totalJobs} jobs to dataset`);
        } catch (error) {
            log.error(`Failed to fetch jobs for ${boardToken}: ${error.message}`);
            throw error;
        }
    },
});

// Add URLs to the crawler
const requests = urls.map(({ url }) => ({ url }));
await crawler.run(requests);

await Actor.exit();
