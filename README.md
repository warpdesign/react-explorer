# Cross-platform File manager for Windows, Mac, Linux

![master Tests](https://github.com/warpdesign/react-explorer/actions/workflows/github-actions-tests.yml/badge.svg?branch=master)

![React-Explorer](./img/react-explorer-theme.png)

## Features

- Split-view window
- Tabs support
- Media File Preview
- Fully keyboard controlled
- Fully localized
- Dark Mode with automatic detection
- Open a terminal from any folder
- Plugin-based filesystem support
- WSL integration (Windows)

## Feature tour

### Trully Cross-platform

React-Explorer is available on every major operating systems & architectures:

 - Windows x66, AARCH64
 - Linux x64, AARCH64
 - macOS x64, AARCH64

### Builtin media file preview

Pressing the `space` bar when a file is selected will open the media preview.
If the file format is supported, it will be displayed without needing any additional
library:

![media-preview](./img/media-preview.gif)


### Dark theme automatic detection (macOS Mojave)

React-Explorer will automatically switch to dark-theme when it's detected:

![dark-theme](./img/feature-darktheme.gif)

### Create and read folder

By pressing `ctrl` (Linux/Win) or `cmd` the folder you create will be automatically read:

![create-read-folder](./img/feature-read-folder.gif)

### Create nested folders

You can create several folders at once by separating them with a forward-slash:

![nested-folders](./img/feature-nested-folders.gif)

### Quick access to parent folders

By right-clicking on a tab's icon you can quickly get access to the parents of the currend folder:

![parent-folders](./img/feature-rightclick-icon.gif)

### WSL support

React-Explorer will automatically detect and show the list of Linux distributions installed using WSL on Windows:

![wsl-support](./img/feature-wsl.jpg)

## Requirements

React-Explorer works on any modern **Windows**, **Mac** or **Linux** **64bit** computer.

## Building for local development

In order to build React-Explorer you need to have installed `nodejs`.

Once installed, building React-Explorer is as easy as typing:

```shell
npm install && npm run build
```

This will build a development package.

In order to run in locally without having to create a native executable, you can then type:

```shell
npx electron ./build/main.js
```

## Building binary packages

In order to build binary packages, simply type the following:

```shell
npm run dist
```

This will build packaged binaries of React Explorer into the `dist` folder for every supported platform.

React-Explorer can also be built for a single patform. For example, to build only the Windows binaries, type:

```shell
npm run dist-win
```

## Localization

React-Explorer is fully localized using `.json` files. Right now, English and French are available.

Adding a new language to React-Explorer is easy: simply duplicate one of the file found in [src/locale/lang](https://github.com/warpdesign/react-explorer/tree/master/src/locale/lang) directory.

The new file should have the name `code.json` where code is a valid language code, for example: `ja.json` to add support for Japanese.

## Tests

### Unit testing

React-Explorer has both unit tests (using Jest) and end to end tests (using Cypress).

To run unit tests simply type:

```shell
npm test
```

This will start Jest and run every spec files found in src. Every test file can be found next to the component it is testing.

### End to End testing

End to end tests are using Cypress and are in the separate `e2e` directory. You must install & configure Cypress before running E2E tests. This needs to be done one once using the following commands:

```shell
cd e2e && npm install && cd ..
```

The first time you run the tests, you also need to install cypress dependencies:

```shell
npm install
```

Since end to end tests need to run Electron-Explorer outside of Electron, a special build needs to be created that stubs some Electron APIs. To create this build, simply type:

```shell
npm run build
```

This will create a new Electron-Explorer in the `build-e2e` directory.

You may also type `npm run watch` if you want to rebuild automatically the e2e build after a change has been detected inside the sources.

For React-Explorer to run without Electron, a local webserver needs to be started before running the tests:

```shell
npm run server
```

Now, simply type: `npm run cypress:run` or `npm run cypress:open`.

## How to develop a new Plugin

React-Explorer has been written so that it can easily be extended using plugins.

As a starting point you may use the `FsGeneric` skeleton.

## Acknowledgments

React-Explorer makes use of the following libraries/components:

- [React](https://reactjs.org)
- [Electron](https://electron.s.org)
- [TypeScript](https://typescriptlang.org)
- [MobX](https://mobx.js.org)
- [Blueprintjs](https://blueprintjs.com)
- [i18next](https://i18next.com) & [react-i18n](https://github.com/i18next/react-i18next)

## Licence

React-Explorer is licenced under the MIT licence.
