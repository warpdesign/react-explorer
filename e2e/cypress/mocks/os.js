module.exports = {
    userInfo: function () {
        return { username: 'cypress' };
    },
    release: function () {
        return __RELEASE__;
    },
    tmpdir: function () {
        return '/tmpdir';
    },
    homedir: function () {
        return '/homedir';
    },
};
