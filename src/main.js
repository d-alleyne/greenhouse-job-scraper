import { Actor, log } from 'apify';

const FETCH_TIMEOUT_MS = 30_000;

/** Normalize any date string to ISO 8601, or null if missing/invalid. */
function toIso(s) {
    if (!s) return null;
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/**
 * Basic job record from list data only (used when the detail fetch fails or throws),
 * so a transient detail error never silently drops the job. Same key set as the full record.
 */
function basicJob(job, department, boardToken) {
    const locationRaw = job.location?.name || '';
    const locations = locationRaw ? locationRaw.split(';').map((l) => l.trim()).filter(Boolean) : [];
    const ll = locationRaw.toLowerCase();
    return {
        id: job.id,
        company: boardToken,
        type: null,
        title: job.title,
        description: '',
        location: locationRaw,
        locations,
        isRemote: ll.includes('remote'),
        isHybrid: ll.includes('hybrid'),
        salary: null,
        department: department.name,
        metadata: {},
        postingUrl: job.absolute_url,
        applyUrl: job.absolute_url,
        publishedAt: toIso(job.updated_at),
    };
}

await Actor.main(async () => {
    const input = await Actor.getInput() || {};
    const { urls = [] } = input;

    if (!Array.isArray(urls) || urls.length === 0) {
        throw new Error('No URLs provided. Please add at least one Greenhouse job board URL.');
    }

    let grandTotal = 0;
    let boardErrors = 0;

    for (const item of urls) {
        // Resolve per-board config with top-level fields taking precedence over userData.
        const { url: boardUrl, maxJobs: maxJobsInput, departments: departmentsInput, daysBack: daysBackInput, userData = {} } = item;
        const rawMaxJobs = maxJobsInput !== undefined ? maxJobsInput : userData.maxJobs;
        const rawDepartments = departmentsInput !== undefined ? departmentsInput : userData.departments;
        const rawDaysBack = daysBackInput !== undefined ? daysBackInput : userData.daysBack;

        // Extract board token; never let a malformed URL abort the whole run.
        let boardToken;
        try {
            boardToken = new URL(boardUrl).pathname.split('/').filter(Boolean)[0];
        } catch {
            boardToken = null;
        }
        if (!boardToken) {
            log.error(`Invalid or unparseable Greenhouse board URL: ${boardUrl}`);
            boardErrors++;
            continue;
        }

        // Extract maxJobs limit if provided (validate it's a non-negative integer, 0 means unlimited)
        let maxJobs = rawMaxJobs;
        if (maxJobs === 0 || maxJobs === null || maxJobs === undefined) {
            maxJobs = null; // Treat 0, null, undefined as unlimited
        } else if (typeof maxJobs !== 'number' || maxJobs < 0 || !Number.isInteger(maxJobs)) {
            log.warning(`Invalid maxJobs value: ${maxJobs}. Ignoring limit.`);
            maxJobs = null;
        }

        // Extract daysBack filter if provided (only keep jobs updated in last N days).
        // Coerce so a stringified "7" from agents/UI still works.
        let cutoffDate = null;
        if (rawDaysBack !== null && rawDaysBack !== undefined) {
            const daysBack = parseInt(rawDaysBack, 10);
            if (Number.isInteger(daysBack) && daysBack > 0) {
                cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - daysBack);
                log.info(`Filtering jobs updated after ${cutoffDate.toISOString()}`);
            } else {
                log.warning(`Invalid daysBack value: ${rawDaysBack}. Ignoring date filter.`);
            }
        }

        const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/departments`;

        // Department filter: coerce so string IDs ("307170") are accepted.
        const departments = rawDepartments || [];
        const departmentIdNumbers = Array.isArray(departments)
            ? departments.map(Number).filter((id) => Number.isInteger(id) && id > 0)
            : [];
        if (departments.length > 0 && departmentIdNumbers.length === 0) {
            log.warning(`Invalid departments array: ${JSON.stringify(departments)}. Must be integers > 0.`);
        }

        log.info(`Fetching jobs from ${boardToken}`, { departments: departmentIdNumbers, maxJobs });

        let totalJobs = 0;
        let filteredByDate = 0;
        try {
            const response = await fetch(apiUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            let departmentsData = data.departments || [];
            log.info(`Found ${departmentsData.length} departments`);

            if (departmentIdNumbers.length > 0) {
                departmentsData = departmentsData.filter((dept) => departmentIdNumbers.includes(dept.id));
                log.info(`Filtered to ${departmentsData.length} departments matching IDs: ${departmentIdNumbers.join(', ')}`);
            }

            const cutoffMs = cutoffDate ? cutoffDate.getTime() : null;

            departmentLoop: for (const department of departmentsData) {
                for (const job of department.jobs || []) {
                    // Recency filter: when set, exclude jobs with missing/invalid dates too.
                    if (cutoffMs !== null) {
                        const t = job.updated_at ? Date.parse(job.updated_at) : NaN;
                        if (Number.isNaN(t) || t < cutoffMs) { filteredByDate++; continue; }
                    }

                    if (maxJobs && totalJobs >= maxJobs) {
                        log.info(`Reached maxJobs limit of ${maxJobs}, stopping`);
                        break departmentLoop;
                    }

                    const jobDetailUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${job.id}`;
                    try {
                        const jobResponse = await fetch(jobDetailUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
                        if (!jobResponse.ok) {
                            log.warning(`Detail fetch ${jobResponse.status} for job ${job.id}; storing basic data`);
                            await Actor.pushData(basicJob(job, department, boardToken));
                            totalJobs++;
                            continue;
                        }

                        const fullJob = await jobResponse.json();

                        const locationRaw = job.location?.name || '';
                        const locationsList = locationRaw
                            ? locationRaw.split(';').map((l) => l.trim()).filter(Boolean)
                            : [];
                        const locationLower = locationRaw.toLowerCase();
                        const isRemote = locationLower.includes('remote');
                        const isHybrid = locationLower.includes('hybrid');

                        // Salary regex. Handles $80k-$120k, $80,000-$120,000, £50k-£70k, €60k-€80k.
                        const salaryMatch = (fullJob.content || '').match(/([£€$])(\d{1,3}(?:,\d{3})*|\d+)[kK]?\s*[-–]\s*\1(\d{1,3}(?:,\d{3})*|\d+)[kK]?/);
                        let salary = null;
                        if (salaryMatch) {
                            // Only scale by 1000 when the matched token actually carries a 'k'.
                            const parseAmount = (str) => {
                                const num = parseInt(str.replace(/,/g, ''), 10);
                                return /[kK]/.test(str) ? num * 1000 : num;
                            };
                            let currency = salaryMatch[1] === '£' ? 'GBP' : salaryMatch[1] === '€' ? 'EUR' : 'USD';
                            if (salaryMatch[1] === '$') {
                                const matchIndex = fullJob.content.indexOf(salaryMatch[0]);
                                const context = fullJob.content.slice(Math.max(0, matchIndex - 200), matchIndex + 200);
                                if (/\bCAD\b|Canada/i.test(context)) currency = 'CAD';
                                else if (/\bAUD\b|Australia/i.test(context)) currency = 'AUD';
                                else if (/\bEUR\b|Europe|Ireland/i.test(context)) currency = 'EUR';
                                else if (/\bGBP\b|UK|United Kingdom/i.test(context)) currency = 'GBP';
                            }
                            salary = { min: parseAmount(salaryMatch[2]), max: parseAmount(salaryMatch[3]), currency, raw: salaryMatch[0] };
                        }

                        const metadata = {};
                        if (Array.isArray(fullJob.metadata)) {
                            fullJob.metadata.forEach((m) => { if (m.name && m.value_text) metadata[m.name] = m.value_text; });
                        }

                        await Actor.pushData({
                            id: job.id,
                            company: boardToken,
                            type: metadata['Employment Type'] || null,
                            title: job.title,
                            description: fullJob.content || '',
                            location: locationRaw,
                            locations: locationsList,
                            isRemote,
                            isHybrid,
                            salary,
                            department: department.name,
                            metadata,
                            postingUrl: job.absolute_url,
                            applyUrl: job.absolute_url,
                            publishedAt: toIso(job.updated_at),
                        });
                        totalJobs++;
                    } catch (err) {
                        // Detail fetch/parse failed: store basic data rather than dropping the job.
                        log.warning(`Detail error for job ${job.id} (${err.message}); storing basic data`);
                        try {
                            await Actor.pushData(basicJob(job, department, boardToken));
                            totalJobs++;
                        } catch (pushErr) {
                            log.error(`Failed to store job ${job.id}: ${pushErr.message}`);
                        }
                    }
                }
            }

            log.info(`Saved ${totalJobs} jobs to dataset`);
            if (filteredByDate > 0) log.info(`Filtered out ${filteredByDate} jobs older than cutoff date`);
            grandTotal += totalJobs;
        } catch (error) {
            boardErrors++;
            log.error(`Failed to fetch jobs for ${boardToken}: ${error.message}`);
            // Continue with the next board instead of aborting the whole run.
        }
    }

    // Surface total failure: if every board errored and nothing was stored, fail the run.
    if (boardErrors > 0 && grandTotal === 0) {
        throw new Error(`All ${boardErrors} board(s) failed and no jobs were stored.`);
    }
    log.info(`Done. Stored ${grandTotal} job(s) across ${urls.length} board(s).`);
});
