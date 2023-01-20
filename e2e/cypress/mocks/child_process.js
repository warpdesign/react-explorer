module.exports = {
    exec: function (_, cb) {
        if (typeof cb === 'function') {
            cb()
        } else {
            return Promise.resolve({
                stdout: ''
            })
        }
    },
    execSync: function(_) {
        return []
    }
}
