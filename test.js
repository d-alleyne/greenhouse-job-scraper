// Simple test without Apify SDK
const testUrl = 'https://job-boards.greenhouse.io/webflow';
const url = new URL(testUrl);
const boardToken = url.pathname.split('/')[1];

console.log('Board token:', boardToken);

const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs`;
console.log('API URL:', apiUrl);

fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
        let jobs = data.jobs || [];
        console.log(`Total jobs: ${jobs.length}\n`);
        
        // Collect all unique departments
        const departmentsMap = new Map();
        jobs.forEach(job => {
            job.departments?.forEach(dept => {
                if (!departmentsMap.has(dept.id)) {
                    departmentsMap.set(dept.id, dept.name);
                }
            });
        });
        
        console.log('Available departments:');
        departmentsMap.forEach((name, id) => {
            console.log(`  ID: ${id} - ${name}`);
        });
        
        // Show first job structure
        if (jobs.length > 0) {
            console.log('\nFirst job structure:');
            console.log(JSON.stringify(jobs[0], null, 2));
        }
    })
    .catch(err => console.error('Error:', err));
