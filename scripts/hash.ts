import { execSync } from 'child_process';
const revision = execSync('git rev-parse HEAD').toString().trim();

export default revision;
