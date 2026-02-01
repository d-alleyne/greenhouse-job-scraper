import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';

await Actor.init();

const input = await Actor.getInput() || {};
const { 
    urls = [], 
    proxy = { useApifyProxy: true },
    departments,
    maxJobs,
    daysBack
} = input;

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

        // Extract maxJobs limit if provided (validate it's a non-negative integer, 0 means unlimited)
        let maxJobs = request.userData?.maxJobs;
        if (maxJobs === 0 || maxJobs === null || maxJobs === undefined) {
            maxJobs = null; // Treat 0, null, undefined as unlimited
        } else if (typeof maxJobs !== 'number' || maxJobs < 0 || !Number.isInteger(maxJobs)) {
            log.warning(`Invalid maxJobs value: ${maxJobs}. Ignoring limit.`);
            maxJobs = null;
        }

        // Extract daysBack filter if provided (only fetch jobs updated in last N days)
        let daysBack = request.userData?.daysBack;
        let cutoffDate = null;
        if (daysBack !== null && daysBack !== undefined) {
            if (typeof daysBack === 'number' && daysBack > 0 && Number.isInteger(daysBack)) {
                cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - daysBack);
                log.info(`Filtering jobs updated after ${cutoffDate.toISOString()}`);
            } else {
                log.warning(`Invalid daysBack value: ${daysBack}. Ignoring date filter.`);
            }
        }

        // Build the API URL - use departments endpoint to get jobs organized by department
        const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/departments`;
        
        // Get department filter from request userData (passed via JSON input)
        const departments = request.userData?.departments || [];
        const departmentIdNumbers = Array.isArray(departments) 
            ? departments.filter(id => Number.isInteger(id) && id > 0)
            : [];
        
        if (departments.length > 0 && departmentIdNumbers.length === 0) {
            log.warning(`Invalid departments array: ${JSON.stringify(departments)}. Must be integers > 0.`);
        }
        
        log.info(`Fetching jobs from ${boardToken}`, { departments: departmentIdNumbers, maxJobs });

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
                log.info(`Filtered to ${departments.length} departments matching IDs: ${departmentIdNumbers.join(', ')}`);
            }

            // Extract and save all jobs from the (filtered) departments
            let totalJobs = 0;
            let filteredByDate = 0;
            departmentLoop: for (const department of departments) {
                const jobs = department.jobs || [];
                
                for (const job of jobs) {
                    // Filter by date if cutoffDate is set
                    if (cutoffDate) {
                        const jobDate = new Date(job.updated_at);
                        if (jobDate < cutoffDate) {
                            filteredByDate++;
                            continue; // Skip this job
                        }
                    }

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
                        
                        // Extract basic salary info with regex
                        // Handles: $80k-$120k, $80,000-$120,000, $80000-$120000, £50k-£70k, €60k-€80k
                        const salaryMatch = (fullJob.content || '').match(/([£€\$])(\d{1,3}(?:,\d{3})*|\d+)[kK]?\s*[-–]\s*\1(\d{1,3}(?:,\d{3})*|\d+)[kK]?/);
                        let salary = null;
                        if (salaryMatch) {
                            const parseAmount = (str) => {
                                const cleaned = str.replace(/,/g, '');
                                const num = parseInt(cleaned);
                                // If it ends with 'k' or is 3 digits or less, multiply by 1000
                                return str.match(/[kK]/) || num < 1000 ? num * 1000 : num;
                            };
                            
                            // Detect currency from symbol, then check context for $ (could be USD, CAD, AUD, etc.)
                            let currency = salaryMatch[1] === '£' ? 'GBP' : salaryMatch[1] === '€' ? 'EUR' : 'USD';
                            if (salaryMatch[1] === '$') {
                                // Try to detect specific currency from nearby context (within 200 chars)
                                const matchIndex = fullJob.content.indexOf(salaryMatch[0]);
                                const context = fullJob.content.slice(Math.max(0, matchIndex - 200), matchIndex + 200);
                                if (/\bCAD\b|Canada/i.test(context)) currency = 'CAD';
                                else if (/\bAUD\b|Australia/i.test(context)) currency = 'AUD';
                                else if (/\bEUR\b|Europe|Ireland/i.test(context)) currency = 'EUR';
                                else if (/\bGBP\b|UK|United Kingdom/i.test(context)) currency = 'GBP';
                                // Otherwise defaults to USD
                            }
                            
                            salary = {
                                min: parseAmount(salaryMatch[2]),
                                max: parseAmount(salaryMatch[3]),
                                currency,
                                raw: salaryMatch[0],
                            };
                        }
                        
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
            if (filteredByDate > 0) {
                log.info(`Filtered out ${filteredByDate} jobs older than cutoff date`);
            }
        } catch (error) {
            log.error(`Failed to fetch jobs for ${boardToken}: ${error.message}`);
            throw error;
        }
    },
});

// Add URLs to the crawler with departments, maxJobs, and daysBack in userData
// Support both new schema (string URLs + top-level filters) and legacy (object URLs)
const requests = urls.map((item) => {
    // Handle both string URLs (new schema) and object URLs (legacy)
    const urlString = typeof item === 'string' ? item : item.url;
    const itemData = typeof item === 'object' ? item : {};
    
    return {
        url: urlString,
        userData: {
            // Input-level fields apply to all URLs (new schema)
            // Item-level fields override input-level (legacy schema support)
            maxJobs: itemData.maxJobs !== undefined ? itemData.maxJobs : maxJobs,
            departments: itemData.departments !== undefined ? itemData.departments : departments,
            daysBack: itemData.daysBack !== undefined ? itemData.daysBack : daysBack
        }
    };
});
await crawler.run(requests);

await Actor.exit();
