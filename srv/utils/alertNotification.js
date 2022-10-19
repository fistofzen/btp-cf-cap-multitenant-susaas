const { OAuthAuthentication, AlertNotificationClient, Severity, Category } = require("@sap_oss/alert-notification-client");
const { Region, Platform } = require("@sap_oss/alert-notification-client/dist/utils/region");
const xsenv = require('@sap/xsenv');
const appEnv = JSON.parse(process.env.VCAP_APPLICATION);

let serviceCredentials = new Object();
let oAuthAuthentication= new Object();

if (cds.env.profiles.includes('production')) {
    serviceCredentials = xsenv.filterCFServices({label: 'alert-notification'})[0];
    oAuthAuthentication = new OAuthAuthentication({
        username: serviceCredentials.credentials.client_id,
        password: serviceCredentials.credentials.client_secret, 
        oAuthTokenUrl: serviceCredentials.credentials.oauth_url.split('?')[0]
    }); 
}

async function sendEvent(event, context) {
    try {
        const client = new AlertNotificationClient({
            authentication: oAuthAuthentication,
            region: new Region(Platform.CF, serviceCredentials.credentials.url),  
        }); 
        switch(event.type) {
            case 'GENERIC':
                return await processEventTypeGeneric(client, event.data);
            default : 
                return await processEventDefault(client, event.data); 
        }

    } catch (error) {
        console.log(error); 
        return JSON.stringify(error);
    };
}

async function processEventTypeGeneric(client, data) {
    const cur_time = Math.floor(+new Date()/ 1000); 
    return await client.sendEvent({
        body: 'Generic event from ' + appEnv.application_name + ' application. DETAILS: ' + JSON.stringify(data.body).replace(/[{}]|,/g, "\\"), 
        subject: data.subject, 
        eventType: data.eventType, 
        severity: Severity[data.severity], 
        category: Category[data.category], 
        resource: {
            resourceName: appEnv.application_name, 
            resourceType: 'deployment', 
            resourceInstance: '1',
            tags: { detailsLink: appEnv.application_uris[0] }
        }, 
        eventTimestamp: cur_time, 
        priority: 1
    });
}

async function processEventDefault(client, data) { return }

module.exports = { sendEvent: sendEvent }