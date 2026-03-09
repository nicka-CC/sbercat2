const API_KEY = 'analyticTh1vgqq6t4HaOmayyt3JT74CfjzB0dR714ka4C8UUcOyfZp3BN9rskgN';
 const API_BASE_URL = 'https://analytic.iwater-crm.online';
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        uuid: params.get('uuid'),
        station: params.get('station')
    };
}
