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
                case 'window:getInitialSettings':
                    return {
                        splitView: false,
                    };
                case 'window:getId':
                    return 0;
                case 'nativeTheme:shouldUseDarkColors':
                    return false;
                case 'openTerminal':
                    return {};
            }
        },
        sendSync: function () {
            //
        },
    },
    remote: {
        getCurrentWindow: () => ({
            id: 9,
        }),
        Menu: {
            buildFromTemplate: function () {
                return {
                    popup: function () {
                        //
                    },
                    closePopup: function () {
                        //
                    },
                };
            },
        },
        app: {
            getLocale: function () {
                return 'en';
            },
            getPath: function (str) {
                return '/cy/' + str;
            },
            getName: function () {
                return 'React-Explorer (Cypress)';
            },
        },
        // new in 7.0
        nativeTheme: {
            shouldUseDarkColors: false,
            on: () => {
                //
            }
        },
    },
};
