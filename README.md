# React-FTP: FTP & local file explorer written in TypeScript & React

## Features

- Plugin-based filesystem type: FTP and local supported for now
- Can be fully keyboard controlled
- Transfers from Local to FTP, from FTP to FTP and from local to local folders
- Fully localized (French & English available)

## Requirements

- Windows 7
- macOS
- Linux

## Building for local development

In order to build React-FTP you need to have installed `nodejs`.

Once installed, building React-FTP is as easy as typing:

```shell
npm install && npm run build
```

This will build a development package.

In order to run in locally without having to create a native executable, you can then type:

```shell
npx electron ./dist/main.js
```

## Building binary packages
TODO

### Windows

### macOS

### Linux

## Tests

## How to develop a new Plugin

React-FTP has been written so that it can easily be extended using plugins.

TODO

## Acknowledgments

FTP-Electron makes use of the following tools/components:

 - [React](https://reactjs.org)
 - [Electron](https://electron.s.org)
 - [TypeScript](https://typescriptlang.org)
 - [Blueprintjs](https://blueprintjs.com)
 - [node-ftp](https://github.com/warpdesign/node-ftp)

 ## Licence

 React-FTP is licenced under the MIT licence.