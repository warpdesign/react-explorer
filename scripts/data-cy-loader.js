module.exports = function dataCyLoader(source) {
    var dataAttr = 'data-cy[a-z,\.,-]*(=\"[^"]*\")*';
    if (source.match(dataAttr)) {
        console.log('++ match');
        source = source.replace(new RegExp(dataAttr, 'g'), '');
    }

    return source;
}