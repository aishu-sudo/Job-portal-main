(function () {
    const port = window.location.port;
    const protocol = window.location.protocol;

    if (protocol === 'file:' || port === '3000' || port === '4000') {
        window.API_BASE = 'http://localhost:5000';
    } else {
        window.API_BASE = '';
    }
})();
