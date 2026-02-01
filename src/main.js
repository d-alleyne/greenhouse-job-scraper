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

        // Extract maxJobs limit if provided (validate it's a positive integer)
        let maxJobs = request.userData?.maxJobs || null;
        if (maxJobs !== null && (typeof maxJobs !== 'number' || maxJobs < 1 || !Number.isInteger(maxJobs))) {
            log.warning(`Invalid maxJobs value: ${maxJobs}. Ignoring limit.`);
            maxJobs = null;
        }

        // Build the API URL - use departments endpoint to get jobs organized by department
        const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/departments`;
        
        // Parse department filters from URL if present (e.g., ?departments[]=59798)
        const departmentIds = url.searchParams.getAll('departments[]');
        const departmentIdNumbers = departmentIds.map(id => parseInt(id, 10));
        
        log.info(`Fetching jobs from ${boardToken}`, { departmentIds, maxJobs });

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
            departmentLoop: for (const department of departments) {
                const jobs = department.jobs || [];
                
                for (const job of jobs) {
                    // Stop if we've reached the maxJobs limit
                    if (maxJobs && totalJobs >= maxJobs) {
                        log.info(`Reached maxJobs limit of ${maxJobs}, stopping`);
                        break departmentLoop;
                    }
                    
                    // Fetch full job details to get description and metadata
                    const jobDetailUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${job.id}`;
                    log.debug(`Fetching full details for job ${job.id}: ${job.title}`);
                    
                    try {
                        const jobResponse = await fetch(jobDetailUrl);
                        if (!jobResponse.ok) {
                            log.warning(`Failed to fetch details for job ${job.id}, using basic data`);
                            // Fallback to basic data if detail fetch fails
                            const locationRaw = job.location?.name || '';
                            const locationsList = locationRaw
                                ? locationRaw.split(';').map(l => l.trim()).filter(Boolean)
                                : [];
                            const locationLower = locationRaw.toLowerCase();
                            
                            const jobData = {
                                id: job.id,
                                company: boardToken,
                                type: null,
                                title: job.title,
                                description: '',
                                location: locationRaw,
                                locations: locationsList,
                                isRemote: locationLower.includes('remote'),
                                isHybrid: locationLower.includes('hybrid'),
                                salary: null,
                                department: department.name,
                                departments: [department.name],
                                metadata: {},
                                postingUrl: job.absolute_url,
                                applyUrl: job.absolute_url,
                                publishedAt: job.updated_at,
                            };
                            await Actor.pushData(jobData);
                            totalJobs++;
                            continue;
                        }
                        
                        const fullJob = await jobResponse.json();
                        
                        // Parse locations into clean array (Greenhouse uses semicolons as delimiter)
                        const locationRaw = job.location?.name || '';
                        const locationsList = locationRaw
                            ? locationRaw.split(';').map(l => l.trim()).filter(Boolean)
                            : [];
                        
                        // Detect remote/hybrid from location string
                        const locationLower = locationRaw.toLowerCase();
                        const isRemote = locationLower.includes('remote');
                        const isHybrid = locationLower.includes('hybrid');
                        
                        // Extract basic salary info with regex (USD patterns only)
                        const salaryMatch = (fullJob.content || '').match(/\$(\d{1,3})[kK]?\s*-\s*\$(\d{1,3})[kK]?/);
                        const salary = salaryMatch ? {
                            min: parseInt(salaryMatch[1]) * 1000,
                            max: parseInt(salaryMatch[2]) * 1000,
                            currency: 'USD',
                            raw: salaryMatch[0],
                        } : null;
                        
                        // Collect all metadata for LLM processing
                        const metadata = {};
                        if (fullJob.metadata && Array.isArray(fullJob.metadata)) {
                            fullJob.metadata.forEach(m => {
                                if (m.name && m.value_text) {
                                    metadata[m.name] = m.value_text;
                                }
                            });
                        }
                        
                        const jobData = {
                            id: job.id,
                            company: boardToken, // Board token is typically the company identifier
                            type: metadata['Employment Type'] || null,
                            title: job.title,
                            description: fullJob.content || '',
                            
                            // Location fields
                            location: locationRaw, // Raw location string for LLM parsing
                            locations: locationsList, // Parsed array
                            isRemote,
                            isHybrid,
                            
                            // Salary (basic regex, LLM can enhance locally)
                            salary,
                            
                            // Department
                            department: department.name,
                            departments: [department.name],
                            
                            // All metadata for flexible LLM processing
                            metadata,
                            
                            // URLs and dates
                            postingUrl: job.absolute_url,
                            applyUrl: job.absolute_url,
                            publishedAt: job.updated_at,
                        };

                        await Actor.pushData(jobData);
                        totalJobs++;
                    } catch (err) {
                        log.error(`Error fetching details for job ${job.id}: ${err.message}`);
                        // Continue with next job instead of failing entire run
                    }
                }
            }

            log.info(`Saved ${totalJobs} jobs to dataset`);
        } catch (error) {
            log.error(`Failed to fetch jobs for ${boardToken}: ${error.message}`);
            throw error;
        }
    },
});

// Add URLs to the crawler with maxJobs in userData
const requests = urls.map(({ url, maxJobs }) => ({ 
    url,
    userData: { maxJobs: maxJobs || null }
}));
await crawler.run(requests);

await Actor.exit();
