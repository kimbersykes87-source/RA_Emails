// ============================================================================
// AUTO-MOVE ROWS - Automatically move Approved/Rejected rows to other tabs
// ============================================================================

/**
 * Automatically moves rows from SOI_Staging to SOI_Approved or SOI_Rejected
 * when Status column changes
 * This function runs automatically on every edit (onEdit simple trigger)
 */
function onEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    
    // Only process edits in SOI_Staging
    if (sheet.getName() !== CONFIG.SHEETS.STAGING) return;
    
    // Only process if Status column was edited
    const statusColIndex = getColumnIndex('Status');
    if (!statusColIndex || range.getColumn() !== statusColIndex) return;
    
    // Get the new status value
    const newStatus = range.getValue();
    
    // Only move if status is Approved or Rejected
    if (newStatus !== 'Approved' && newStatus !== 'Rejected') return;
    
    // Get the row that was edited
    const row = range.getRow();
    if (row === 1) return; // Don't process header row
    
    // Determine target sheet
    const targetSheetName = newStatus === 'Approved' 
      ? CONFIG.SHEETS.APPROVED 
      : CONFIG.SHEETS.REJECTED;
    
    // Move the row
    moveRowToSheet(sheet, row, targetSheetName);
    
  } catch (error) {
    Logger.log('Error in onEdit: ' + error.toString());
  }
}

/**
 * Moves a row from source sheet to target sheet
 * @param {Sheet} sourceSheet - The source sheet
 * @param {number} rowNumber - The row number to move (1-based)
 * @param {string} targetSheetName - Name of target sheet
 */
function moveRowToSheet(sourceSheet, rowNumber, targetSheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheet = ss.getSheetByName(targetSheetName);
  
  if (!targetSheet) {
    SpreadsheetApp.getUi().alert('❌ Target sheet not found: ' + targetSheetName);
    return;
  }
  
  // Get the row data
  const numColumns = CONFIG.HEADERS.length;
  const rowData = sourceSheet.getRange(rowNumber, 1, 1, numColumns).getValues()[0];
  
  // Append to target sheet
  targetSheet.appendRow(rowData);
  
  // Delete from source sheet
  sourceSheet.deleteRow(rowNumber);
  
  Logger.log('Moved row ' + rowNumber + ' to ' + targetSheetName);
}

/**
 * Manual function to move all Approved/Rejected rows at once
 * Useful if you have multiple rows to move
 * Go to: Run → moveApprovedAndRejectedRows
 */
function moveApprovedAndRejectedRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stagingSheet = ss.getSheetByName(CONFIG.SHEETS.STAGING);
  
  if (!stagingSheet) {
    SpreadsheetApp.getUi().alert('❌ SOI_Staging sheet not found!');
    return;
  }
  
  const statusColIndex = getColumnIndex('Status');
  if (!statusColIndex) {
    SpreadsheetApp.getUi().alert('❌ Status column not found!');
    return;
  }
  
  const numColumns = CONFIG.HEADERS.length;
  const lastRow = stagingSheet.getLastRow();
  
  let approvedCount = 0;
  let rejectedCount = 0;
  
  // Process from bottom to top (so row deletion doesn't affect iteration)
  for (let row = lastRow; row >= 2; row--) {
    const status = stagingSheet.getRange(row, statusColIndex).getValue();
    
    if (status === 'Approved') {
      moveRowToSheet(stagingSheet, row, CONFIG.SHEETS.APPROVED);
      approvedCount++;
    } else if (status === 'Rejected') {
      moveRowToSheet(stagingSheet, row, CONFIG.SHEETS.REJECTED);
      rejectedCount++;
    }
  }
  
  SpreadsheetApp.getUi().alert(
    '✅ Rows moved!\n\n' +
    'Approved: ' + approvedCount + '\n' +
    'Rejected: ' + rejectedCount
  );
}

