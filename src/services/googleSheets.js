const { google } = require('googleapis');
const path = require('path');

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '../jsons/credentials.json'),
    scopes: "https://www.googleapis.com/auth/spreadsheets"
});

async function getSheetsClient() {
    const sheetClient = await auth.getClient();
    return google.sheets({ version: "v4", auth: sheetClient });
}

module.exports = getSheetsClient;