module.exports = {
    userInfo: function () {
        return { username: 'cypress' };
    },
    release: function () {
        return __RELEASE__;
    },
    platform: function () {
        return __PLATFORM__;
    },
    arch: function () {
        return __ARCH__;
    },
    tmpdir: function () {
        return '/tmpdir';
    },
    homedir: function () {
        return '/homedir';
    },
};
