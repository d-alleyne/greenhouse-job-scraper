// Test the departments API approach
const testUrl = 'https://job-boards.greenhouse.io/webflow?departments[]=59798';
const url = new URL(testUrl);
const boardToken = url.pathname.split('/')[1];
const departmentIds = url.searchParams.getAll('departments[]');
const departmentIdNumbers = departmentIds.map(id => parseInt(id, 10));

console.log('Board token:', boardToken);
console.log('Department IDs:', departmentIds);

const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/departments`;
console.log('API URL:', apiUrl);

fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
        let departments = data.departments || [];
        console.log(`Total departments: ${departments.length}`);
        
        if (departmentIdNumbers.length > 0) {
            departments = departments.filter(dept => departmentIdNumbers.includes(dept.id));
            console.log(`Filtered departments: ${departments.length}`);
        }
        
        let totalJobs = 0;
        departments.forEach(dept => {
            console.log(`\nDepartment: ${dept.name} (ID: ${dept.id})`);
            console.log(`Jobs: ${dept.jobs.length}`);
            totalJobs += dept.jobs.length;
            
            if (dept.jobs.length > 0) {
                console.log(`First job: ${dept.jobs[0].title}`);
            }
        });
        
        console.log(`\nTotal jobs to scrape: ${totalJobs}`);
    })
    .catch(err => console.error('Error:', err));
