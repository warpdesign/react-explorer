import { execSync } from 'child_process';
const revision = execSync('git rev-parse --short HEAD').toString().trim();

export default revision;
