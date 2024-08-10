/*
File that uses google apps scripts to go through 
google sheets files in our google drive, and then
through the individual bib entires to extract info.
Then, we validate each bibliography entry by
calling the respective functions.
*/
// To do:
// Make node able to run in google app scripts
// Fix import statements

// import required functions from validate.js file
import { validate, getData, queryCrossref } from './validate.js';
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

let spreadsheet_names = []; // store all spreadsheet names for search function
let total_entries = []; // store all entry information for search function (user can enter key words) 

let errors = [];
// Other helper functions
function readInData(inputFolderID) {
  /* 
  Function reads in data from Google Drive folder.
  */

  // Obtain files 
  let folder = DriveApp.getFolderById(inputFolderID);

  // Error check the getFolderByID call
  if (folder){
    return folder.getFilesByType(MimeType.GOOGLE_SHEETS); // Return files 
  } else {
    return "Folder does not exist or is not accessible "
  }
}

function isIterator(obj) {
  /*Helper function that checks whether an object is an iterator or not
  This is useful for error checking the following custom return types"
  */
  return typeof obj.hasNext === 'function' && typeof obj.next === 'function';
}

// doGet function / HTTP GET request 
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index');
}

// Add in all available spreadsheets that can be selected 
function updateSpreadsheetOptions() {
  for (let i = 0; i < spreadsheet_names.length; i++) {
    document.querySelector("#spreadsheet-name-dropdown").innerHTML += '<option value=' + '"' + spreadsheet_names[i] + '"' + ">" + spreadsheet_names[i] + '</option>';
  }
}

// main function 
function main() {
  /* 
  This function obtains all data from the spreadsheets in the biblographies folder and validates the data in 
  the spreadsheet. If a spreadsheet contains at least one invalid entry, create a report.md file to report on the error.
  */

  // Obtain all files from Biblographies folder
  let folderID = '1pvG9GSODByNfIM7iwTBjuSYnIBxLjSNz';
  let folderFileIterator = readInData(folderID); // Returns a FileIterator object. We can use this to "validate" whether we got the correct spreadsheets

  // Handle the return type of readInData 
  let isIteratorVal = isIterator(folderFileIterator)
  if (!isIteratorVal){
    console.log("Could not read folder ID. Folder does not exist or is inaccessible");
    return;
  }

  // Iterate through the variable: folderFileIterator.
  while(folderFileIterator.hasNext()){
    // Getting file name 
    let currFile = folderFileIterator.next();
    let currFileName = currFile.getName();
    console.log("Name of the spreadsheet in the folder is: " + currFileName) //Print out list of Spreadsheet names for testing
    spreadsheet_names.push(currFileName); // search function purposes


    // Attempting to open the file. Error handle if cannot open 
    try{
      let currFileOpened = SpreadsheetApp.openById(currFile.getId());
      let numSheets = (currFileOpened.getNumSheets()).toString(); // Converting this to a string (original return type: Integer)
      if (numSheets < 2){
        console.log("The spreadsheet: " + currFileName + "has no entries yet (missing 2nd page).") //TODO: Think of a better comment message
        return;
      }
      // Here we are assuming that the biblographies are on the second sheet and the first sheet is an example
      let sheet = currFileOpened.getSheets()[1];
      // Retrieve the data in the sheet
      let sheetData = sheet.getDataRange().getValues();

      for (let i = 0; i < sheetData.length; i++){ // iterate through all bib entries
        
        let a = sheetData[i]
        let separated_authors = a[1].split(',').map(name => name.trim());
        let _DOI = a[5];

        let temp_dict = { // create dict that stores info on entry we have on spreadsheet
          title: a[0],
          contributors: separated_authors, // Used string methods to turn this into a list separated by commas
          year: a[2],
          format: a[3],
          DOI: _DOI,
          bibtex_citation: a[6]
        }; 

        const sample_response = queryCrossref(_DOI); // generate XML response from DOI
        const data_from_crossref = getData(sample_response); // parse XML response and generate data in dict
        const errors_for_given_entry = validate(temp_dict, data_from_crossref); // compare two dicts and record errors
        errors.push(errors_for_given_entry); // add to overall error array
      }
      // Write errors to a JSON file
      const errorsFilePath = path.join(__dirname, 'errors.json');
      fs.writeFileSync(errorsFilePath, JSON.stringify(errors), 'utf8');

      // After processing errors, run insert.js
      exec('node insert.js', (err, stdout, stderr) => {
        if (err) {
          console.error(`Error executing insert.js: ${err}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
      });

    } catch (error) {
      if (error.message.indexOf('You do not have permission') !== -1) {
        console.error('You do not have permission to view the file');
      } 
      else if (error.message.indexOf('Document is missing') !== -1) {
        console.error('Document cannot be found. Check if document was deleted or moved elsewhere:', error);
      }
    }
  }
}

$(document).ready(function() {
  // execute the main function
  main();
  
  // Update spreadsheet selection 
  updateSpreadsheetOptions();
});
