module.exports = {
    ipcRenderer: {
        send: function () {
            //
        },
        sendTo: function () {
            //
        },
        on: function (event, method) {
            document.addEventListener(event, function (e) {
                method(e, { data: e.data, combo: e.combo });
            });
        },
        invoke: function (command) {
            switch (command) {
                case 'window:getCustomSettings':
                    return {
                        splitView: false,
                    };
                case 'window:getId':
                    return 0;
                case 'nativeTheme:shouldUseDarkColors':
                    return false;
                case 'openTerminal':
                    return {};

                // case 'needsCleanup':
                //     return

                // case 'app:getLocale':
                //     return 'en'

                // default:
                //     throw(`Missing electron remote command mock: ${command}`)
            }
        },
        sendSync: function () {
            //
        },
    },
    clipboard: {
        writeText: function(text) {
            //
        }
    },
    webFrame: {
        setVisualZoomLevelLimits: function (minimumLevel, maximumLevel) {
            //
        }
    }
};
