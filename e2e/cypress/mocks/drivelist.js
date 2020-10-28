module.exports = {
    testDrives: [
        {
            isRemovable: true,
            mountpoints: [
                {
                    path: '/Vols/react-explorer',
                    label: 'React-Explorer',
                },
            ],
        },
        {
            isRemovable: false,
            mountpoints: [
                {
                    path: '/hdd1',
                    label: 'HDD1',
                },
            ],
        },
        {
            isRemovable: false,
            mountpoints: [
                {
                    path: '/hdd2',
                    label: 'HDD2',
                },
            ],
        },
    ],
    list: function () {
        return Promise.resolve(this.testDrives);
    },
};
