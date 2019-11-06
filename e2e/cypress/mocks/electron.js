module.exports = {
    ipcRenderer: {
        send: function() {

        },
        on: function(event, method) {
            document.addEventListener(event, function(e) {
                method(e, { data: e.data, combo: e.combo });
            });
        }
    },
    remote: {
        getCurrentWindow: () => {

        },
        Menu: {
            buildFromTemplate: function() {
                return {
                    popup: function() {

                    },
                    closePopup: function() {

                    }
                };
            }
        },
        app: {
            getLocale: function() {
                return "en";
            },
            getPath: function(str) {
                return "/cy/" + str;
            }
        }
    }
};

