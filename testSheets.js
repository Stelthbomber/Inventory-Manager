require('dotenv').config();
const getSheetsClient = require('./src/services/googleSheets');

async function getBalance() {
    try {
        const sheets = await getSheetsClient();
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Data!J2', // Adjust as needed
        });
        console.log('Balance:', res.data.values[0][0]);
    } catch (error) {
        console.error('Error reading balance:', error);
    }
}

getBalance();