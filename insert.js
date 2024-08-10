/*
This file is used to push errors and text to report.md, a markdown file which 
will be where our report is displayed. This is run automatically when we run
main.js, and it generates/populates report.md with the correct error information.
Note that we will be writing to console for error testing, and in the finished product we won't.
*/ 
const fs = require('fs');
const path = require('path');

const reportMdPath = path.join(__dirname, 'report.md');
const errorsFilePath = path.join(__dirname, 'errors.json');
const message = "No errors found.";
let errors = [];

// read errors from errors.json file
if (fs.existsSync(errorsFilePath)) {
    const errorsData = fs.readFileSync(errorsFilePath, 'utf8');
    errors = JSON.parse(errorsData);
}
let i = 1; // iterator to keep track of error number

// clear report.md
fs.writeFile(reportMdPath, '', (err) => {
    if (err) {
        console.error('Cannot build report', err);
        return;
    }
    if (errors.length === 0) {
        // if there are no error instances in errors.json:
        const lineToInsert = `${message}\n`;
        fs.appendFile(reportMdPath, lineToInsert, (err) => {
            if (err) {
                console.error(`Error writing to report`, err);
                return;
            }
            console.log('No errors found, message inserted successfully!');
        });
    } else {
        errors.forEach((error) => {
            let lineToInsert = `\nError ${i}: ${error}\n`;
            fs.appendFile(reportMdPath, lineToInsert, (err) => {
                if (err) {
                    console.error(`Error writing to report`, err);
                    return;
                }
                console.log(`Error ${i} reported!`);
                i += 1; 
            });
        });
    }
});
