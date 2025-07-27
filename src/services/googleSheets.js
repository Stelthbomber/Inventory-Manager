const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');

const credentials = {
    type: 'service_account',
    project_id: process.env.GOOGLE_SHEETS_PROJECT_ID,
    private_key_id: process.env.GOOGLE_SHEETS_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_SHEETS_CLIENT_ID,
    auth_uri: process.env.GOOGLE_SHEETS_AUTH_URI,
    token_uri: process.env.GOOGLE_SHEETS_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_SHEETS_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_SHEETS_CLIENT_X509_CERT_URL,
    universe_domain: process.env.GOOGLE_SHEETS_UNIVERSE_DOMAIN,
};

const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function getSheetsClient() {
    const authClient = await auth.getClient();
    return google.sheets({ version: "v4", auth: authClient });
}

module.exports = getSheetsClient;