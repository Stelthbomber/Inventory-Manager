const fs = require('fs');
const path = require('path');
const counterPath = path.join(__dirname, '../jsons/updateCounter.json');

function getNextUpdateNumber() {
    let counter = { current: 1 };
    if (fs.existsSync(counterPath)) {
        counter = JSON.parse(fs.readFileSync(counterPath, 'utf8'));
    }
    const updateNumber = counter.current;
    counter.current += 1;
    fs.writeFileSync(counterPath, JSON.stringify(counter));
    return updateNumber;
}

module.exports = { getNextUpdateNumber };