// This is free and unencumbered software released into the public domain.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
// OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.
//
// AUTHOR: Jonathan Bowen (www.dragondrop.uk)
// Additional changes by Kuovonne Vorderbruggen
//
// SCRIPT: Script for Airtable script block to find and replace text
// DISCLAIMER:
// - Test the script first on a copy of your base
// - Try a few different scenarios to make sure it works as you expect
// - Take a snapshot of your production base before using the script
// - Duplicate the field you're working on (with field contents) in case you want to go back to the original content
// - Use at your own risk!


await airtableFindAndReplace();

async function airtableFindAndReplace() {
  let scriptDescription = "This script performs a **find and replace** for a single column/field of a table ";
  scriptDescription += "using [regular expressions](https://en.wikipedia.org/wiki/Regular_expression).";
  output.markdown(scriptDescription);
  let {table, field} = await pickTableAndField();
  if (field == null) {
    // can't do find and replace if there is no text field
    return;
  }
  let {stringToFind, stringToReplace, myRegex} = await getStringsToFindAndReplace();
  await performFindAndReplace(table, field, stringToFind, stringToReplace, myRegex);
}


async function pickTableAndField() {
  // user chooses the table...
  let table = await input.tableAsync('Pick a table');
  // ...and a field
  // The script only works against text-type fields
  let allowedFields = table.fields.filter((field) =>{
    switch(field.type) {
      case "singleLineText":
      case "multilineText":
      case "richText":
        return true;
      default:
        return false;
    }
  });
  let field;
  if (allowedFields.length > 1) {
    // have user select button for text field
    let allowedFieldNames = allowedFields.map(field => field.name);
    let fieldName = await input.buttonsAsync('Pick a field', allowedFieldNames);
    field = table.getField(fieldName);
  } else if (allowedFields.length == 1) {
    // only one text field to use
    field = allowedFields[0];
  } else {
    field = null;
  }
  // Shows the field name
  if (field) {
    output.text(`Doing find and replace on field "${field.name}" in table "${table.name}".`);
  } else {
    output.text(`Sorry - no text fields in table "${table.name}".`);
  }
  return {table, field};
}


async function getStringsToFindAndReplace() {
  // enter the string you want to find...
  let stringToFind = await input.textAsync('Enter the string to find');
  // ...and the string you want to replace it with
  let stringToReplace = "";
  let replaceOrRemove = await input.buttonsAsync('Replace with a new string, or remove string?', ["Replace", "Remove"]);
  if (replaceOrRemove == "Replace") {
    stringToReplace = await input.textAsync('Enter the string to replace it with');
  }
  // define a new regex based on the sting to find
  // this configuration replaces all instances of the string to find and is case sensitive
  let myRegex = new RegExp(stringToFind,"g");
  return {stringToFind, stringToReplace, myRegex}
}


async function performFindAndReplace(table, field, stringToFind, stringToReplace, myRegex) {
  // get the records from the table
  let query = await table.selectRecordsAsync();
  let countOfRecords = 0;
  output.text("The following records will be changed:")
  // get the records which contain the string to find and output the before and after version
  // note that records are not changed at this point, we're just showing what will be changed if you go ahead
  for (let record of query.records) {
      if (record.getCellValue(field.name) && record.getCellValue(field.name).includes(stringToFind)) {
          let newText = record.getCellValue(field.name).replace(myRegex, stringToReplace);
          output.text(`(Record: ${record.name}) ${record.getCellValue(field.name)} => ${newText}`);
          output.text("============================");
          countOfRecords = countOfRecords += 1;
      }
  }
  // if nothing matches the string to find, then finish
  if (countOfRecords == 0) {
      output.text("Sorry - can't find any records to update - please try again!")
  } else if (countOfRecords > 0) {
      // otherwise check with the user if they want to proceed with the find and replace
      let proceedOrCancel = await input.buttonsAsync('Would you like to proceed or cancel?', ['Proceed', 'Cancel']);
      if (proceedOrCancel === 'Proceed') {
          output.text('Proceeding...');
          for (let record of query.records) {
              if (record.getCellValue(field.name) && record.getCellValue(field.name).includes(stringToFind)) {
                  let newText = record.getCellValue(field.name).replace(myRegex, stringToReplace);
                  // update the records
                  let update = await table.updateRecordAsync(record, {
                      [field.name]: newText
                  })
                  output.text(`Record: ${record.name} updated`);
              }
          }
          output.text("The find and replace action has finished")
      } else {
          output.text("The find and replace action was cancelled");
      }
  }
}
