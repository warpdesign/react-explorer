// // load the library
// var SMB2 = require('smb2');

// // create an SMB2 instance
// var smb2Client = new SMB2({
//   share:'\\\\wsl$'
// // , domain:'DOMAIN'
// // , username:'username'
// // , password:'password!'
// });

// const fs = require('fs');

// fs.readdir('\\\\wsl$\\Ubuntu-20.04\\home\\leo\\chars-test', (err, items) => {
//   if (err) {
//     console.log('error', err);
//   } else {
//     items.forEach((char) => console.log(char));
//   }
// });

const fs = require('fs');
const process = require('child_process')

// try {
//   process.execSync('wsl.exe -d Ubuntu-22.04 -- inotifywait2')
//   console.log('yo!')
// } catch(e) {
//   console.log('error', e.status)
// }

process.exec('wsl.exe -d Ubuntu-22.04 -- inotifywait', ({ code }) => {
  console.log(code === 127)
})

// fs.mkdir('//wsl$/Ubuntu-20.04/tmp/\"', 0777, (err) => {
//   console.log('res', err);
// });
