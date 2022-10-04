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

// process.exec('wsl.exe -d Ubuntu-22.04 -- inotifywait -e delete -e move -e create /tmp', (error, stdout) => {
//   console.log('stdout', stdout)
//   console.log(error?.code === 127)
// })

try {
  const child = process.spawn('c:\\windows\\system32\\wsl.exe', ['-d', 'Ubuntu-22.04', '--', 'inotifywait', '-e', 'delete', '-e', 'move', '-e', 'create', '-m', '/tmp'], {
    // stdio: 'ignore'
  })
  child.on('error', (e) => console.log('error', e))
  child.on('close', (e) => console.log('error', e))
  child.stdout.on('data', (data) => {
    console.log(`yo`)
  })
  // setTimeout(() => {
  //   console.log('need to kill process')
  //   child.kill('SIGKILL')
  // }, 5000)
} catch(e) {
  console.log('error creating child', e)
}


// fs.mkdir('//wsl$/Ubuntu-20.04/tmp/\"', 0777, (err) => {
//   console.log('res', err);
// });
