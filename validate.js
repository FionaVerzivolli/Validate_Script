/*
This file includes the function used to validate each of the 
entries in our spreadsheet using crossref API and fetch API
*/


async function queryCrossref(doi) { // input doi and retrieve corresponding entries on record in XML format (Crossref)
    const url = "https://doi.crossref.org/servlet/query"; // query

    const xmlData = `<?xml version = "1.0" encoding="UTF-8"?> 
    <query_batch version="2.0" xmlns="https://www.crossref.org/qschema/2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
      <head>
          <email_address>streetlab.ischool@utoronto.ca</email_address> 
          <doi_batch_id>Sample multi resolve</doi_batch_id>
      </head>
      <body>
        <query key="mykey" expanded-results="true">
            <doi>${doi}</doi>
        </query>
      </body>
    </query_batch>`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/xml'
        },
        body: xmlData
    });

    if (response.ok) { // check for errors
        const textResponse = await response.text();
        return textResponse;
    } else {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }
}

// now we want to parse the data we gathered from queryCrossref function
// xmlResponse will be what we get from calling queryCrossref 

function getData(xmlResponse) { // parse information from xml result and store it in a dictionary
    const parser = new DOMParser(); // initialize parser
    const xmlDoc = parser.parseFromString(xmlResponse, "application/xml");
    let metadata = {};
    // store all data in a dict, will be easier to look up in validate function.
    // continue storing all other desired information.
    metadata.doi = record.getElementsByTagName("doi").textContent || 'No DOI found';
    metadata.title = record.getElementsByTagName("title").textContent || 'No title found';
    metadata.journal_title = record.getElementsByTagName("journal_title").textContent || 'No journal title found'; 
    metadata.article = record.getElementsByTagName("article").textContent || 'No article name found';
    metadata.volume = record.getElementsByTagName("volume").textContent || 'No volume number found';
    metadata.issue = record.getElementsByTagName("issue").textContent || 'No issue number found';
    metadata.year = record.getElementsByTagName("year").textContent || 'No year found';
    metadata.publication_type = record.getElementsByTagName("publication_type").textContent || 'No publication type found';
    metadata.contributors = new Set();

    const records = xmlDoc.getElementsByTagName("contributors");
    // loop through given contributors
    for (let record of records) {
        let first_name = record.children[0] ? record.children[0].textContent : 'No first name found';
        let last_name = record.children[1] ? record.children[1].textContent : 'No last name found';
        // add first name and last name of contributor to the set
        metadata.contributors.add(`${first_name} ${last_name}`);
    }
    
    return metadata;

}

queryCrossref(doi)
    .then(xmlResponse => {
        console.log(xmlResponse);  // print raw XML text response (testing purposes)
        parseResponse(xmlResponse);  // parse and print specific data from the XML response
    })
    .catch(error => { // check for error
        console.error(error);
    });

function validate(bibliography_entry, info_from_API) { // matches given data from sheet to API data 
    const errors = [];
    
    for (let key in bibliography_entry) { // record all errors by comparing dict keys
        if(!info_from_API.hasOwnProperty(key)){
            errors.push("There is no recorded " + key + " in existing records.");
        } else if(info_from_API.hasOwnProperty(key) && bibliography_entry[key] !== info_from_API[key]) {
            errors.push("Mismatch in " + key + ": " + bibliography_entry[key] + " is outdated, should be " + info_from_API[key]);
        } 
    }
    
    return errors;
}


export { validate, getData, queryCrossref }; // export functions and list of errors
