/**
 * Rubber Armstrong 2026 - Google Contacts Auto-Sync
 * Automatically syncs approved SOI submissions to Google Contacts
 * 
 * Features:
 * - Header-based column mapping (no hardcoded positions)
 * - Automatic sync when status changes to "Approved"
 * - Label-only for existing contacts (no data overwrite)
 * - Full contact creation for new contacts
 */

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

/**
 * Run this to enable automatic sync on status change
 * Go to: Run → setupContactsSync
 */
function setupContactsSync() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onStatusChange') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger
  ScriptApp.newTrigger('onStatusChange')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  
  SpreadsheetApp.getUi().alert(
    '✅ Automatic sync enabled!\n\n' +
    'When you change Status to "Approved", the contact will be:\n' +
    '- Created in Google Contacts (if new)\n' +
    '- Added to "' + CONFIG.CONTACTS.LABEL + '" label\n' +
    '- Marked as "Synced to Contacts"\n\n' +
    'Existing contacts will only get the label (no data overwrite).'
  );
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

/**
 * Trigger function - runs when any cell is edited
 * Only syncs when Status column changes to "Approved"
 */
function onStatusChange(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    
    // Only process staging and approved sheets
    const sheetName = sheet.getName();
    if (sheetName !== CONFIG.SHEETS.STAGING && sheetName !== CONFIG.SHEETS.APPROVED) {
      return;
    }
    
    // Get headers to find Status column
    const headers = getSheetHeaders(sheet);
    const statusColIndex = headers.indexOf('Status') + 1;
    
    // Only process if Status column was edited
    const col = range.getColumn();
    if (col !== statusColIndex) {
      return;
    }
    
    // Only process if new value is "Approved"
    const newValue = range.getValue();
    if (newValue !== 'Approved') {
      return;
    }
    
    // Get row data
    const row = range.getRow();
    const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Check if already synced
    const syncedIndex = headers.indexOf('Synced to Contacts');
    if (syncedIndex !== -1 && rowData[syncedIndex] === 'Yes') {
      Logger.log('Row ' + row + ' already synced, skipping');
      return;
    }
    
    // Sync the contact
    syncContactToGoogle(rowData, sheet, row, headers);
    Logger.log('Auto-synced contact from row ' + row);
    
  } catch (error) {
    Logger.log('Error in onStatusChange: ' + error.toString());
  }
}

/**
 * Manually sync all approved contacts
 * Go to: Run → syncAllApprovedContacts
 */
function syncAllApprovedContacts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.APPROVED);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('❌ ' + CONFIG.SHEETS.APPROVED + ' sheet not found!');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const statusIndex = headers.indexOf('Status');
  const syncedIndex = headers.indexOf('Synced to Contacts');
  
  let syncCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1;
    
    // Skip if already synced
    if (syncedIndex !== -1 && row[syncedIndex] === 'Yes') {
      skipCount++;
      continue;
    }
    
    // Skip if not approved
    if (statusIndex !== -1 && row[statusIndex] !== 'Approved') {
      skipCount++;
      continue;
    }
    
    try {
      syncContactToGoogle(row, sheet, rowNumber, headers);
      syncCount++;
      Utilities.sleep(500); // Rate limiting
    } catch (error) {
      Logger.log('Error syncing row ' + rowNumber + ': ' + error.toString());
      errorCount++;
    }
  }
  
  SpreadsheetApp.getUi().alert(
    '✅ Sync complete!\n\n' +
    'Synced: ' + syncCount + '\n' +
    'Skipped: ' + skipCount + '\n' +
    'Errors: ' + errorCount
  );
}

/**
 * Main sync function - creates or updates a contact
 * @param {Array} row - Row data from sheet
 * @param {Sheet} sheet - Sheet object
 * @param {number} rowNumber - Row number (1-based)
 * @param {Array} headers - Header row from sheet
 */
function syncContactToGoogle(row, sheet, rowNumber, headers) {
  // Get column indices
  const firstNameIndex = headers.indexOf('First');
  const lastNameIndex = headers.indexOf('Last');
  const emailIndex = headers.indexOf('Email');
  const phoneCodeIndex = headers.indexOf('Phone Code');
  const phoneIndex = headers.indexOf('Phone');
  const syncedIndex = headers.indexOf('Synced to Contacts');
  
  // Extract data
  const firstName = row[firstNameIndex];
  const lastName = row[lastNameIndex];
  const email = row[emailIndex];
  const phoneCode = row[phoneCodeIndex];
  const phoneNumber = row[phoneIndex];
  
  if (!email) {
    throw new Error('No email address found');
  }
  
  // Check if contact exists
  const existingContacts = People.People.searchContacts({
    query: email,
    readMask: 'names,emailAddresses'
  });
  
  if (existingContacts.results && existingContacts.results.length > 0) {
    // Contact exists - only add label
    const resourceName = existingContacts.results[0].person.resourceName;
    Logger.log('Contact already exists: ' + email + ' - Adding to label only');
    
    try {
      addToContactGroup(resourceName);
      if (syncedIndex !== -1) {
        sheet.getRange(rowNumber, syncedIndex + 1).setValue('Yes');
      }
      Logger.log('Added existing contact to label: ' + email);
      return;
    } catch (error) {
      Logger.log('Error adding existing contact to label: ' + error.toString());
      throw error;
    }
  }
  
  // Contact doesn't exist - create new contact
  const contactData = {
    names: [{
      givenName: firstName || '',
      familyName: lastName || ''
    }],
    emailAddresses: [{
      value: email,
      type: 'home'
    }],
    biographies: [{
      value: buildContactNotes(row, headers),
      contentType: 'TEXT_PLAIN'
    }],
    userDefined: buildUserDefinedFields(row, headers)
  };
  
  // Add phone if available
  if (phoneNumber && phoneNumber.toString().trim() !== '') {
    try {
      let fullPhone = phoneNumber.toString().trim().replace(/[^\d+]/g, '');
      let code = phoneCode ? phoneCode.toString().trim() : '';
      
      if (code && !fullPhone.startsWith('+')) {
        if (!code.startsWith('+')) {
          code = '+' + code;
        }
        fullPhone = code + fullPhone;
      } else if (!fullPhone.startsWith('+')) {
        fullPhone = '+1' + fullPhone;
      }
      
      if (fullPhone.length >= 10) {
        contactData.phoneNumbers = [{
          value: fullPhone,
          type: 'mobile'
        }];
      }
    } catch (phoneError) {
      Logger.log('Skipping invalid phone for ' + email);
    }
  }
  
  // Create new contact
  const contact = People.People.createContact(contactData);
  Logger.log('Created new contact: ' + email);
  
  // Add to group
  try {
    addToContactGroup(contact.resourceName);
  } catch (error) {
    Logger.log('Could not add new contact to group: ' + error.toString());
  }
  
  // Mark as synced
  if (syncedIndex !== -1) {
    sheet.getRange(rowNumber, syncedIndex + 1).setValue('Yes');
  }
  Logger.log('Successfully created and labeled new contact: ' + email);
}

/**
 * Build contact notes from row data
 * @param {Array} row - Row data
 * @param {Array} headers - Header row
 * @returns {string} Formatted contact notes
 */
function buildContactNotes(row, headers) {
  const burnsRAIndex = headers.indexOf('Burns (RA)');
  const burnsOtherIndex = headers.indexOf('Burns (Other)');
  const likelihoodIndex = headers.indexOf('Likelihood');
  const stewardIndex = headers.indexOf('Steward Ticket?');
  const whatOfferIndex = headers.indexOf('What Offer');
  const notesIndex = headers.indexOf('Notes');
  const referringIndex = headers.indexOf('Ref. Campmate');
  const firstBurnIndex = headers.indexOf('First Burn?');
  
  const burnsRA = burnsRAIndex !== -1 ? row[burnsRAIndex] : '';
  const burnsOther = burnsOtherIndex !== -1 ? row[burnsOtherIndex] : '';
  const likelihood = likelihoodIndex !== -1 ? row[likelihoodIndex] : '';
  const steward = stewardIndex !== -1 ? row[stewardIndex] : '';
  const whatOffer = whatOfferIndex !== -1 ? row[whatOfferIndex] : '';
  const notes = notesIndex !== -1 ? row[notesIndex] : '';
  const referring = referringIndex !== -1 ? row[referringIndex] : '';
  const firstBurn = firstBurnIndex !== -1 ? row[firstBurnIndex] : '';
  
  let contactNotes = '🎪 RUBBER ARMSTRONG 2026\n\n';
  
  if (firstBurn === 'Yes') {
    contactNotes += '🔥 First Burn: YES\n';
  } else {
    if (burnsRA) contactNotes += '🔥 Burns with RA: ' + burnsRA + '\n';
    if (burnsOther) contactNotes += '🔥 Other Burns: ' + burnsOther + '\n';
  }
  
  contactNotes += '\n';
  
  if (likelihood) contactNotes += '📊 Likelihood: ' + likelihood + '\n';
  if (steward) contactNotes += '🎫 Steward Interest: ' + steward + '\n';
  if (referring) contactNotes += '👥 Referred by: ' + referring + '\n';
  
  contactNotes += '\n';
  
  if (whatOffer) contactNotes += '💡 What they offer:\n' + whatOffer + '\n\n';
  if (notes) contactNotes += '📝 Notes:\n' + notes + '\n';
  
  contactNotes += '\n---\nSynced from SOI form: ' + new Date().toLocaleDateString();
  
  return contactNotes;
}

/**
 * Build user-defined fields for contact
 * @param {Array} row - Row data
 * @param {Array} headers - Header row
 * @returns {Array} User-defined fields
 */
function buildUserDefinedFields(row, headers) {
  const likelihoodIndex = headers.indexOf('Likelihood');
  const firstBurnIndex = headers.indexOf('First Burn?');
  const stewardIndex = headers.indexOf('Steward Ticket?');
  
  return [
    { key: 'Camp', value: 'Rubber Armstrong' },
    { key: 'Year', value: '2026' },
    { key: 'Likelihood', value: likelihoodIndex !== -1 ? (row[likelihoodIndex] || '') : '' },
    { key: 'First Burn', value: firstBurnIndex !== -1 ? (row[firstBurnIndex] || '') : '' },
    { key: 'Steward Interest', value: stewardIndex !== -1 ? (row[stewardIndex] || '') : '' }
  ];
}

/**
 * Add contact to the configured label/group
 * @param {string} resourceName - Contact resource name
 */
function addToContactGroup(resourceName) {
  try {
    // List all contact groups
    const groups = People.ContactGroups.list({
      pageSize: 1000
    });
    
    let groupResourceName;
    
    // Find existing group
    if (groups.contactGroups) {
      const existingGroup = groups.contactGroups.find(g => {
        const name = g.name || '';
        const formatted = g.formattedName || '';
        return name === CONFIG.CONTACTS.LABEL || 
               formatted === CONFIG.CONTACTS.LABEL ||
               name.includes('2026 Rubbers') ||
               formatted.includes('2026 Rubbers');
      });
      
      if (existingGroup) {
        groupResourceName = existingGroup.resourceName;
        Logger.log('Found existing group: ' + groupResourceName);
      }
    }
    
    // Create group if it doesn't exist
    if (!groupResourceName) {
      try {
        const newGroup = People.ContactGroups.create({
          contactGroup: {
            name: CONFIG.CONTACTS.LABEL
          }
        });
        groupResourceName = newGroup.resourceName;
        Logger.log('Created new contact group: ' + CONFIG.CONTACTS.LABEL + ' (' + groupResourceName + ')');
      } catch (createError) {
        Logger.log('Error creating group: ' + createError.toString());
        throw createError;
      }
    }
    
    // Add contact to group
    if (groupResourceName && resourceName) {
      try {
        People.ContactGroups.Members.modify({
          resourceNamesToAdd: [resourceName]
        }, groupResourceName);
        Logger.log('Successfully added contact to group: ' + CONFIG.CONTACTS.LABEL);
      } catch (addError) {
        Logger.log('Error adding to group: ' + addError.toString());
        // Don't throw - contact was created successfully
      }
    }
    
  } catch (error) {
    Logger.log('Error in addToContactGroup: ' + error.toString());
    // Don't throw - we don't want to fail the whole sync if just the label fails
  }
}

// ============================================================================
// UTILITY & TEST FUNCTIONS
// ============================================================================

/**
 * Test sync with a single approved contact
 * Go to: Run → testContactSync
 */
function testContactSync() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.APPROVED);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('❌ ' + CONFIG.SHEETS.APPROVED + ' sheet not found!');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const statusIndex = headers.indexOf('Status');
  const syncedIndex = headers.indexOf('Synced to Contacts');
  const emailIndex = headers.indexOf('Email');
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = statusIndex !== -1 ? row[statusIndex] : '';
    const synced = syncedIndex !== -1 ? row[syncedIndex] : '';
    const email = emailIndex !== -1 ? row[emailIndex] : '';
    
    if (status === 'Approved' && synced !== 'Yes') {
      try {
        syncContactToGoogle(row, sheet, i + 1, headers);
        SpreadsheetApp.getUi().alert(
          '✅ Test sync successful!\n\n' +
          'Check Google Contacts for: ' + email
        );
        return;
      } catch (error) {
        SpreadsheetApp.getUi().alert('❌ Test failed:\n\n' + error.toString());
        return;
      }
    }
  }
  
  SpreadsheetApp.getUi().alert('No approved contacts found to test with.');
}

/**
 * Clear all sync status (for re-syncing)
 * Go to: Run → clearSyncStatus
 */
function clearSyncStatus() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Clear Sync Status',
    'This will clear "Synced to Contacts" for all rows.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    return;
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = [CONFIG.SHEETS.APPROVED, CONFIG.SHEETS.STAGING];
  
  sheetNames.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      const headers = getSheetHeaders(sheet);
      const syncedIndex = headers.indexOf('Synced to Contacts');
      
      if (syncedIndex !== -1) {
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.getRange(2, syncedIndex + 1, lastRow - 1, 1).setValue('');
        }
      }
    }
  });
  
  ui.alert('✅ Sync status cleared!');
}

/**
 * List all contact groups (for debugging)
 * Go to: Run → listContactGroups
 */
function listContactGroups() {
  try {
    const groups = People.ContactGroups.list({
      pageSize: 1000
    });
    
    Logger.log('=== ALL CONTACT GROUPS ===');
    
    if (groups.contactGroups) {
      groups.contactGroups.forEach(group => {
        Logger.log('- ' + (group.formattedName || group.name) + ' (' + group.resourceName + ')');
        Logger.log('  Members: ' + (group.memberCount || 0));
      });
      
      SpreadsheetApp.getUi().alert(
        'Found ' + groups.contactGroups.length + ' contact groups\n\n' +
        'Check the Execution log for details'
      );
    } else {
      Logger.log('No contact groups found');
      SpreadsheetApp.getUi().alert('No contact groups found');
    }
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error:\n\n' + error.toString());
  }
}

/**
 * Rubber Armstrong 2026 - Google Contacts Auto-Sync
 * Automatically syncs approved SOI submissions to Google Contacts
 * 
 * Features:
 * - Header-based column mapping (no hardcoded positions)
 * - Automatic sync when status changes to "Approved"
 * - Label-only for existing contacts (no data overwrite)
 * - Full contact creation for new contacts
 */

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

/**
 * Run this to enable automatic sync on status change
 * Go to: Run → setupContactsSync
 */
function setupContactsSync() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onStatusChange') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger
  ScriptApp.newTrigger('onStatusChange')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  
  SpreadsheetApp.getUi().alert(
    '✅ Automatic sync enabled!\n\n' +
    'When you change Status to "Approved", the contact will be:\n' +
    '- Created in Google Contacts (if new)\n' +
    '- Added to "' + CONFIG.CONTACTS.LABEL + '" label\n' +
    '- Marked as "Synced to Contacts"\n\n' +
    'Existing contacts will only get the label (no data overwrite).'
  );
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

/**
 * Trigger function - runs when any cell is edited
 * Only syncs when Status column changes to "Approved"
 */
function onStatusChange(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    
    // Only process staging and approved sheets
    const sheetName = sheet.getName();
    if (sheetName !== CONFIG.SHEETS.STAGING && sheetName !== CONFIG.SHEETS.APPROVED) {
      return;
    }
    
    // Get headers to find Status column
    const headers = getSheetHeaders(sheet);
    const statusColIndex = headers.indexOf('Status') + 1;
    
    // Only process if Status column was edited
    const col = range.getColumn();
    if (col !== statusColIndex) {
      return;
    }
    
    // Only process if new value is "Approved"
    const newValue = range.getValue();
    if (newValue !== 'Approved') {
      return;
    }
    
    // Get row data
    const row = range.getRow();
    const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Check if already synced
    const syncedIndex = headers.indexOf('Synced to Contacts');
    if (syncedIndex !== -1 && rowData[syncedIndex] === 'Yes') {
      Logger.log('Row ' + row + ' already synced, skipping');
      return;
    }
    
    // Sync the contact
    syncContactToGoogle(rowData, sheet, row, headers);
    Logger.log('Auto-synced contact from row ' + row);
    
  } catch (error) {
    Logger.log('Error in onStatusChange: ' + error.toString());
  }
}

/**
 * Manually sync all approved contacts
 * Go to: Run → syncAllApprovedContacts
 */
function syncAllApprovedContacts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.APPROVED);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('❌ ' + CONFIG.SHEETS.APPROVED + ' sheet not found!');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const statusIndex = headers.indexOf('Status');
  const syncedIndex = headers.indexOf('Synced to Contacts');
  
  let syncCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1;
    
    // Skip if already synced
    if (syncedIndex !== -1 && row[syncedIndex] === 'Yes') {
      skipCount++;
      continue;
    }
    
    // Skip if not approved
    if (statusIndex !== -1 && row[statusIndex] !== 'Approved') {
      skipCount++;
      continue;
    }
    
    try {
      syncContactToGoogle(row, sheet, rowNumber, headers);
      syncCount++;
      Utilities.sleep(500); // Rate limiting
    } catch (error) {
      Logger.log('Error syncing row ' + rowNumber + ': ' + error.toString());
      errorCount++;
    }
  }
  
  SpreadsheetApp.getUi().alert(
    '✅ Sync complete!\n\n' +
    'Synced: ' + syncCount + '\n' +
    'Skipped: ' + skipCount + '\n' +
    'Errors: ' + errorCount
  );
}

/**
 * Main sync function - creates or updates a contact
 * @param {Array} row - Row data from sheet
 * @param {Sheet} sheet - Sheet object
 * @param {number} rowNumber - Row number (1-based)
 * @param {Array} headers - Header row from sheet
 */
function syncContactToGoogle(row, sheet, rowNumber, headers) {
  // Get column indices
  const firstNameIndex = headers.indexOf('First');
  const lastNameIndex = headers.indexOf('Last');
  const emailIndex = headers.indexOf('Email');
  const phoneCodeIndex = headers.indexOf('Phone Code');
  const phoneIndex = headers.indexOf('Phone');
  const syncedIndex = headers.indexOf('Synced to Contacts');
  
  // Extract data
  const firstName = row[firstNameIndex];
  const lastName = row[lastNameIndex];
  const email = row[emailIndex];
  const phoneCode = row[phoneCodeIndex];
  const phoneNumber = row[phoneIndex];
  
  if (!email) {
    throw new Error('No email address found');
  }
  
  // Check if contact exists
  const existingContacts = People.People.searchContacts({
    query: email,
    readMask: 'names,emailAddresses'
  });
  
  if (existingContacts.results && existingContacts.results.length > 0) {
    // Contact exists - only add label
    const resourceName = existingContacts.results[0].person.resourceName;
    Logger.log('Contact already exists: ' + email + ' - Adding to label only');
    
    try {
      addToContactGroup(resourceName);
      if (syncedIndex !== -1) {
        sheet.getRange(rowNumber, syncedIndex + 1).setValue('Yes');
      }
      Logger.log('Added existing contact to label: ' + email);
      return;
    } catch (error) {
      Logger.log('Error adding existing contact to label: ' + error.toString());
      throw error;
    }
  }
  
  // Contact doesn't exist - create new contact
  const contactData = {
    names: [{
      givenName: firstName || '',
      familyName: lastName || ''
    }],
    emailAddresses: [{
      value: email,
      type: 'home'
    }],
    biographies: [{
      value: buildContactNotes(row, headers),
      contentType: 'TEXT_PLAIN'
    }],
    userDefined: buildUserDefinedFields(row, headers)
  };
  
  // Add phone if available
  if (phoneNumber && phoneNumber.toString().trim() !== '') {
    try {
      let fullPhone = phoneNumber.toString().trim().replace(/[^\d+]/g, '');
      let code = phoneCode ? phoneCode.toString().trim() : '';
      
      if (code && !fullPhone.startsWith('+')) {
        if (!code.startsWith('+')) {
          code = '+' + code;
        }
        fullPhone = code + fullPhone;
      } else if (!fullPhone.startsWith('+')) {
        fullPhone = '+1' + fullPhone;
      }
      
      if (fullPhone.length >= 10) {
        contactData.phoneNumbers = [{
          value: fullPhone,
          type: 'mobile'
        }];
      }
    } catch (phoneError) {
      Logger.log('Skipping invalid phone for ' + email);
    }
  }
  
  // Create new contact
  const contact = People.People.createContact(contactData);
  Logger.log('Created new contact: ' + email);
  
  // Add to group
  try {
    addToContactGroup(contact.resourceName);
  } catch (error) {
    Logger.log('Could not add new contact to group: ' + error.toString());
  }
  
  // Mark as synced
  if (syncedIndex !== -1) {
    sheet.getRange(rowNumber, syncedIndex + 1).setValue('Yes');
  }
  Logger.log('Successfully created and labeled new contact: ' + email);
}

/**
 * Build contact notes from row data
 * @param {Array} row - Row data
 * @param {Array} headers - Header row
 * @returns {string} Formatted contact notes
 */
function buildContactNotes(row, headers) {
  const burnsRAIndex = headers.indexOf('Burns (RA)');
  const burnsOtherIndex = headers.indexOf('Burns (Other)');
  const likelihoodIndex = headers.indexOf('Likelihood');
  const stewardIndex = headers.indexOf('Steward Ticket?');
  const whatOfferIndex = headers.indexOf('What Offer');
  const notesIndex = headers.indexOf('Notes');
  const referringIndex = headers.indexOf('Ref. Campmate');
  const firstBurnIndex = headers.indexOf('First Burn?');
  
  const burnsRA = burnsRAIndex !== -1 ? row[burnsRAIndex] : '';
  const burnsOther = burnsOtherIndex !== -1 ? row[burnsOtherIndex] : '';
  const likelihood = likelihoodIndex !== -1 ? row[likelihoodIndex] : '';
  const steward = stewardIndex !== -1 ? row[stewardIndex] : '';
  const whatOffer = whatOfferIndex !== -1 ? row[whatOfferIndex] : '';
  const notes = notesIndex !== -1 ? row[notesIndex] : '';
  const referring = referringIndex !== -1 ? row[referringIndex] : '';
  const firstBurn = firstBurnIndex !== -1 ? row[firstBurnIndex] : '';
  
  let contactNotes = '🎪 RUBBER ARMSTRONG 2026\n\n';
  
  if (firstBurn === 'Yes') {
    contactNotes += '🔥 First Burn: YES\n';
  } else {
    if (burnsRA) contactNotes += '🔥 Burns with RA: ' + burnsRA + '\n';
    if (burnsOther) contactNotes += '🔥 Other Burns: ' + burnsOther + '\n';
  }
  
  contactNotes += '\n';
  
  if (likelihood) contactNotes += '📊 Likelihood: ' + likelihood + '\n';
  if (steward) contactNotes += '🎫 Steward Interest: ' + steward + '\n';
  if (referring) contactNotes += '👥 Referred by: ' + referring + '\n';
  
  contactNotes += '\n';
  
  if (whatOffer) contactNotes += '💡 What they offer:\n' + whatOffer + '\n\n';
  if (notes) contactNotes += '📝 Notes:\n' + notes + '\n';
  
  contactNotes += '\n---\nSynced from SOI form: ' + new Date().toLocaleDateString();
  
  return contactNotes;
}

/**
 * Build user-defined fields for contact
 * @param {Array} row - Row data
 * @param {Array} headers - Header row
 * @returns {Array} User-defined fields
 */
function buildUserDefinedFields(row, headers) {
  const likelihoodIndex = headers.indexOf('Likelihood');
  const firstBurnIndex = headers.indexOf('First Burn?');
  const stewardIndex = headers.indexOf('Steward Ticket?');
  
  return [
    { key: 'Camp', value: 'Rubber Armstrong' },
    { key: 'Year', value: '2026' },
    { key: 'Likelihood', value: likelihoodIndex !== -1 ? (row[likelihoodIndex] || '') : '' },
    { key: 'First Burn', value: firstBurnIndex !== -1 ? (row[firstBurnIndex] || '') : '' },
    { key: 'Steward Interest', value: stewardIndex !== -1 ? (row[stewardIndex] || '') : '' }
  ];
}

/**
 * Add contact to the configured label/group
 * @param {string} resourceName - Contact resource name
 */
function addToContactGroup(resourceName) {
  try {
    // List all contact groups
    const groups = People.ContactGroups.list({
      pageSize: 1000
    });
    
    let groupResourceName;
    
    // Find existing group
    if (groups.contactGroups) {
      const existingGroup = groups.contactGroups.find(g => {
        const name = g.name || '';
        const formatted = g.formattedName || '';
        return name === CONFIG.CONTACTS.LABEL || 
               formatted === CONFIG.CONTACTS.LABEL ||
               name.includes('2026 Rubbers') ||
               formatted.includes('2026 Rubbers');
      });
      
      if (existingGroup) {
        groupResourceName = existingGroup.resourceName;
        Logger.log('Found existing group: ' + groupResourceName);
      }
    }
    
    // Create group if it doesn't exist
    if (!groupResourceName) {
      try {
        const newGroup = People.ContactGroups.create({
          contactGroup: {
            name: CONFIG.CONTACTS.LABEL
          }
        });
        groupResourceName = newGroup.resourceName;
        Logger.log('Created new contact group: ' + CONFIG.CONTACTS.LABEL + ' (' + groupResourceName + ')');
      } catch (createError) {
        Logger.log('Error creating group: ' + createError.toString());
        throw createError;
      }
    }
    
    // Add contact to group
    if (groupResourceName && resourceName) {
      try {
        People.ContactGroups.Members.modify({
          resourceNamesToAdd: [resourceName]
        }, groupResourceName);
        Logger.log('Successfully added contact to group: ' + CONFIG.CONTACTS.LABEL);
      } catch (addError) {
        Logger.log('Error adding to group: ' + addError.toString());
        // Don't throw - contact was created successfully
      }
    }
    
  } catch (error) {
    Logger.log('Error in addToContactGroup: ' + error.toString());
    // Don't throw - we don't want to fail the whole sync if just the label fails
  }
}

// ============================================================================
// UTILITY & TEST FUNCTIONS
// ============================================================================

/**
 * Test sync with a single approved contact
 * Go to: Run → testContactSync
 */
function testContactSync() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.APPROVED);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('❌ ' + CONFIG.SHEETS.APPROVED + ' sheet not found!');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const statusIndex = headers.indexOf('Status');
  const syncedIndex = headers.indexOf('Synced to Contacts');
  const emailIndex = headers.indexOf('Email');
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = statusIndex !== -1 ? row[statusIndex] : '';
    const synced = syncedIndex !== -1 ? row[syncedIndex] : '';
    const email = emailIndex !== -1 ? row[emailIndex] : '';
    
    if (status === 'Approved' && synced !== 'Yes') {
      try {
        syncContactToGoogle(row, sheet, i + 1, headers);
        SpreadsheetApp.getUi().alert(
          '✅ Test sync successful!\n\n' +
          'Check Google Contacts for: ' + email
        );
        return;
      } catch (error) {
        SpreadsheetApp.getUi().alert('❌ Test failed:\n\n' + error.toString());
        return;
      }
    }
  }
  
  SpreadsheetApp.getUi().alert('No approved contacts found to test with.');
}

/**
 * Clear all sync status (for re-syncing)
 * Go to: Run → clearSyncStatus
 */
function clearSyncStatus() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Clear Sync Status',
    'This will clear "Synced to Contacts" for all rows.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    return;
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = [CONFIG.SHEETS.APPROVED, CONFIG.SHEETS.STAGING];
  
  sheetNames.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      const headers = getSheetHeaders(sheet);
      const syncedIndex = headers.indexOf('Synced to Contacts');
      
      if (syncedIndex !== -1) {
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.getRange(2, syncedIndex + 1, lastRow - 1, 1).setValue('');
        }
      }
    }
  });
  
  ui.alert('✅ Sync status cleared!');
}

/**
 * List all contact groups (for debugging)
 * Go to: Run → listContactGroups
 */
function listContactGroups() {
  try {
    const groups = People.ContactGroups.list({
      pageSize: 1000
    });
    
    Logger.log('=== ALL CONTACT GROUPS ===');
    
    if (groups.contactGroups) {
      groups.contactGroups.forEach(group => {
        Logger.log('- ' + (group.formattedName || group.name) + ' (' + group.resourceName + ')');
        Logger.log('  Members: ' + (group.memberCount || 0));
      });
      
      SpreadsheetApp.getUi().alert(
        'Found ' + groups.contactGroups.length + ' contact groups\n\n' +
        'Check the Execution log for details'
      );
    } else {
      Logger.log('No contact groups found');
      SpreadsheetApp.getUi().alert('No contact groups found');
    }
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error:\n\n' + error.toString());
  }
}

/**
 * Rubber Armstrong 2026 - Google Contacts Auto-Sync
 * Automatically syncs approved SOI submissions to Google Contacts
 * 
 * Features:
 * - Header-based column mapping (no hardcoded positions)
 * - Automatic sync when status changes to "Approved"
 * - Label-only for existing contacts (no data overwrite)
 * - Full contact creation for new contacts
 */

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

/**
 * Run this to enable automatic sync on status change
 * Go to: Run → setupContactsSync
 */
function setupContactsSync() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onStatusChange') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger
  ScriptApp.newTrigger('onStatusChange')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  
  SpreadsheetApp.getUi().alert(
    '✅ Automatic sync enabled!\n\n' +
    'When you change Status to "Approved", the contact will be:\n' +
    '- Created in Google Contacts (if new)\n' +
    '- Added to "' + CONFIG.CONTACTS.LABEL + '" label\n' +
    '- Marked as "Synced to Contacts"\n\n' +
    'Existing contacts will only get the label (no data overwrite).'
  );
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

/**
 * Trigger function - runs when any cell is edited
 * Only syncs when Status column changes to "Approved"
 */
function onStatusChange(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    
    // Only process staging and approved sheets
    const sheetName = sheet.getName();
    if (sheetName !== CONFIG.SHEETS.STAGING && sheetName !== CONFIG.SHEETS.APPROVED) {
      return;
    }
    
    // Get headers to find Status column
    const headers = getSheetHeaders(sheet);
    const statusColIndex = headers.indexOf('Status') + 1;
    
    // Only process if Status column was edited
    const col = range.getColumn();
    if (col !== statusColIndex) {
      return;
    }
    
    // Only process if new value is "Approved"
    const newValue = range.getValue();
    if (newValue !== 'Approved') {
      return;
    }
    
    // Get row data
    const row = range.getRow();
    const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Check if already synced
    const syncedIndex = headers.indexOf('Synced to Contacts');
    if (syncedIndex !== -1 && rowData[syncedIndex] === 'Yes') {
      Logger.log('Row ' + row + ' already synced, skipping');
      return;
    }
    
    // Sync the contact
    syncContactToGoogle(rowData, sheet, row, headers);
    Logger.log('Auto-synced contact from row ' + row);
    
  } catch (error) {
    Logger.log('Error in onStatusChange: ' + error.toString());
  }
}

/**
 * Manually sync all approved contacts
 * Go to: Run → syncAllApprovedContacts
 */
function syncAllApprovedContacts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.APPROVED);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('❌ ' + CONFIG.SHEETS.APPROVED + ' sheet not found!');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const statusIndex = headers.indexOf('Status');
  const syncedIndex = headers.indexOf('Synced to Contacts');
  
  let syncCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1;
    
    // Skip if already synced
    if (syncedIndex !== -1 && row[syncedIndex] === 'Yes') {
      skipCount++;
      continue;
    }
    
    // Skip if not approved
    if (statusIndex !== -1 && row[statusIndex] !== 'Approved') {
      skipCount++;
      continue;
    }
    
    try {
      syncContactToGoogle(row, sheet, rowNumber, headers);
      syncCount++;
      Utilities.sleep(500); // Rate limiting
    } catch (error) {
      Logger.log('Error syncing row ' + rowNumber + ': ' + error.toString());
      errorCount++;
    }
  }
  
  SpreadsheetApp.getUi().alert(
    '✅ Sync complete!\n\n' +
    'Synced: ' + syncCount + '\n' +
    'Skipped: ' + skipCount + '\n' +
    'Errors: ' + errorCount
  );
}

/**
 * Main sync function - creates or updates a contact
 * @param {Array} row - Row data from sheet
 * @param {Sheet} sheet - Sheet object
 * @param {number} rowNumber - Row number (1-based)
 * @param {Array} headers - Header row from sheet
 */
function syncContactToGoogle(row, sheet, rowNumber, headers) {
  // Get column indices
  const firstNameIndex = headers.indexOf('First');
  const lastNameIndex = headers.indexOf('Last');
  const emailIndex = headers.indexOf('Email');
  const phoneCodeIndex = headers.indexOf('Phone Code');
  const phoneIndex = headers.indexOf('Phone');
  const syncedIndex = headers.indexOf('Synced to Contacts');
  
  // Extract data
  const firstName = row[firstNameIndex];
  const lastName = row[lastNameIndex];
  const email = row[emailIndex];
  const phoneCode = row[phoneCodeIndex];
  const phoneNumber = row[phoneIndex];
  
  if (!email) {
    throw new Error('No email address found');
  }
  
  // Check if contact exists
  const existingContacts = People.People.searchContacts({
    query: email,
    readMask: 'names,emailAddresses'
  });
  
  if (existingContacts.results && existingContacts.results.length > 0) {
    // Contact exists - only add label
    const resourceName = existingContacts.results[0].person.resourceName;
    Logger.log('Contact already exists: ' + email + ' - Adding to label only');
    
    try {
      addToContactGroup(resourceName);
      if (syncedIndex !== -1) {
        sheet.getRange(rowNumber, syncedIndex + 1).setValue('Yes');
      }
      Logger.log('Added existing contact to label: ' + email);
      return;
    } catch (error) {
      Logger.log('Error adding existing contact to label: ' + error.toString());
      throw error;
    }
  }
  
  // Contact doesn't exist - create new contact
  const contactData = {
    names: [{
      givenName: firstName || '',
      familyName: lastName || ''
    }],
    emailAddresses: [{
      value: email,
      type: 'home'
    }],
    biographies: [{
      value: buildContactNotes(row, headers),
      contentType: 'TEXT_PLAIN'
    }],
    userDefined: buildUserDefinedFields(row, headers)
  };
  
  // Add phone if available
  if (phoneNumber && phoneNumber.toString().trim() !== '') {
    try {
      let fullPhone = phoneNumber.toString().trim().replace(/[^\d+]/g, '');
      let code = phoneCode ? phoneCode.toString().trim() : '';
      
      if (code && !fullPhone.startsWith('+')) {
        if (!code.startsWith('+')) {
          code = '+' + code;
        }
        fullPhone = code + fullPhone;
      } else if (!fullPhone.startsWith('+')) {
        fullPhone = '+1' + fullPhone;
      }
      
      if (fullPhone.length >= 10) {
        contactData.phoneNumbers = [{
          value: fullPhone,
          type: 'mobile'
        }];
      }
    } catch (phoneError) {
      Logger.log('Skipping invalid phone for ' + email);
    }
  }
  
  // Create new contact
  const contact = People.People.createContact(contactData);
  Logger.log('Created new contact: ' + email);
  
  // Add to group
  try {
    addToContactGroup(contact.resourceName);
  } catch (error) {
    Logger.log('Could not add new contact to group: ' + error.toString());
  }
  
  // Mark as synced
  if (syncedIndex !== -1) {
    sheet.getRange(rowNumber, syncedIndex + 1).setValue('Yes');
  }
  Logger.log('Successfully created and labeled new contact: ' + email);
}

/**
 * Build contact notes from row data
 * @param {Array} row - Row data
 * @param {Array} headers - Header row
 * @returns {string} Formatted contact notes
 */
function buildContactNotes(row, headers) {
  const burnsRAIndex = headers.indexOf('Burns (RA)');
  const burnsOtherIndex = headers.indexOf('Burns (Other)');
  const likelihoodIndex = headers.indexOf('Likelihood');
  const stewardIndex = headers.indexOf('Steward Ticket?');
  const whatOfferIndex = headers.indexOf('What Offer');
  const notesIndex = headers.indexOf('Notes');
  const referringIndex = headers.indexOf('Ref. Campmate');
  const firstBurnIndex = headers.indexOf('First Burn?');
  
  const burnsRA = burnsRAIndex !== -1 ? row[burnsRAIndex] : '';
  const burnsOther = burnsOtherIndex !== -1 ? row[burnsOtherIndex] : '';
  const likelihood = likelihoodIndex !== -1 ? row[likelihoodIndex] : '';
  const steward = stewardIndex !== -1 ? row[stewardIndex] : '';
  const whatOffer = whatOfferIndex !== -1 ? row[whatOfferIndex] : '';
  const notes = notesIndex !== -1 ? row[notesIndex] : '';
  const referring = referringIndex !== -1 ? row[referringIndex] : '';
  const firstBurn = firstBurnIndex !== -1 ? row[firstBurnIndex] : '';
  
  let contactNotes = '🎪 RUBBER ARMSTRONG 2026\n\n';
  
  if (firstBurn === 'Yes') {
    contactNotes += '🔥 First Burn: YES\n';
  } else {
    if (burnsRA) contactNotes += '🔥 Burns with RA: ' + burnsRA + '\n';
    if (burnsOther) contactNotes += '🔥 Other Burns: ' + burnsOther + '\n';
  }
  
  contactNotes += '\n';
  
  if (likelihood) contactNotes += '📊 Likelihood: ' + likelihood + '\n';
  if (steward) contactNotes += '🎫 Steward Interest: ' + steward + '\n';
  if (referring) contactNotes += '👥 Referred by: ' + referring + '\n';
  
  contactNotes += '\n';
  
  if (whatOffer) contactNotes += '💡 What they offer:\n' + whatOffer + '\n\n';
  if (notes) contactNotes += '📝 Notes:\n' + notes + '\n';
  
  contactNotes += '\n---\nSynced from SOI form: ' + new Date().toLocaleDateString();
  
  return contactNotes;
}

/**
 * Build user-defined fields for contact
 * @param {Array} row - Row data
 * @param {Array} headers - Header row
 * @returns {Array} User-defined fields
 */
function buildUserDefinedFields(row, headers) {
  const likelihoodIndex = headers.indexOf('Likelihood');
  const firstBurnIndex = headers.indexOf('First Burn?');
  const stewardIndex = headers.indexOf('Steward Ticket?');
  
  return [
    { key: 'Camp', value: 'Rubber Armstrong' },
    { key: 'Year', value: '2026' },
    { key: 'Likelihood', value: likelihoodIndex !== -1 ? (row[likelihoodIndex] || '') : '' },
    { key: 'First Burn', value: firstBurnIndex !== -1 ? (row[firstBurnIndex] || '') : '' },
    { key: 'Steward Interest', value: stewardIndex !== -1 ? (row[stewardIndex] || '') : '' }
  ];
}

/**
 * Add contact to the configured label/group
 * @param {string} resourceName - Contact resource name
 */
function addToContactGroup(resourceName) {
  try {
    // List all contact groups
    const groups = People.ContactGroups.list({
      pageSize: 1000
    });
    
    let groupResourceName;
    
    // Find existing group
    if (groups.contactGroups) {
      const existingGroup = groups.contactGroups.find(g => {
        const name = g.name || '';
        const formatted = g.formattedName || '';
        return name === CONFIG.CONTACTS.LABEL || 
               formatted === CONFIG.CONTACTS.LABEL ||
               name.includes('2026 Rubbers') ||
               formatted.includes('2026 Rubbers');
      });
      
      if (existingGroup) {
        groupResourceName = existingGroup.resourceName;
        Logger.log('Found existing group: ' + groupResourceName);
      }
    }
    
    // Create group if it doesn't exist
    if (!groupResourceName) {
      try {
        const newGroup = People.ContactGroups.create({
          contactGroup: {
            name: CONFIG.CONTACTS.LABEL
          }
        });
        groupResourceName = newGroup.resourceName;
        Logger.log('Created new contact group: ' + CONFIG.CONTACTS.LABEL + ' (' + groupResourceName + ')');
      } catch (createError) {
        Logger.log('Error creating group: ' + createError.toString());
        throw createError;
      }
    }
    
    // Add contact to group
    if (groupResourceName && resourceName) {
      try {
        People.ContactGroups.Members.modify({
          resourceNamesToAdd: [resourceName]
        }, groupResourceName);
        Logger.log('Successfully added contact to group: ' + CONFIG.CONTACTS.LABEL);
      } catch (addError) {
        Logger.log('Error adding to group: ' + addError.toString());
        // Don't throw - contact was created successfully
      }
    }
    
  } catch (error) {
    Logger.log('Error in addToContactGroup: ' + error.toString());
    // Don't throw - we don't want to fail the whole sync if just the label fails
  }
}

// ============================================================================
// UTILITY & TEST FUNCTIONS
// ============================================================================

/**
 * Test sync with a single approved contact
 * Go to: Run → testContactSync
 */
function testContactSync() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.APPROVED);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('❌ ' + CONFIG.SHEETS.APPROVED + ' sheet not found!');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const statusIndex = headers.indexOf('Status');
  const syncedIndex = headers.indexOf('Synced to Contacts');
  const emailIndex = headers.indexOf('Email');
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = statusIndex !== -1 ? row[statusIndex] : '';
    const synced = syncedIndex !== -1 ? row[syncedIndex] : '';
    const email = emailIndex !== -1 ? row[emailIndex] : '';
    
    if (status === 'Approved' && synced !== 'Yes') {
      try {
        syncContactToGoogle(row, sheet, i + 1, headers);
        SpreadsheetApp.getUi().alert(
          '✅ Test sync successful!\n\n' +
          'Check Google Contacts for: ' + email
        );
        return;
      } catch (error) {
        SpreadsheetApp.getUi().alert('❌ Test failed:\n\n' + error.toString());
        return;
      }
    }
  }
  
  SpreadsheetApp.getUi().alert('No approved contacts found to test with.');
}

/**
 * Clear all sync status (for re-syncing)
 * Go to: Run → clearSyncStatus
 */
function clearSyncStatus() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Clear Sync Status',
    'This will clear "Synced to Contacts" for all rows.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    return;
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = [CONFIG.SHEETS.APPROVED, CONFIG.SHEETS.STAGING];
  
  sheetNames.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      const headers = getSheetHeaders(sheet);
      const syncedIndex = headers.indexOf('Synced to Contacts');
      
      if (syncedIndex !== -1) {
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.getRange(2, syncedIndex + 1, lastRow - 1, 1).setValue('');
        }
      }
    }
  });
  
  ui.alert('✅ Sync status cleared!');
}

/**
 * List all contact groups (for debugging)
 * Go to: Run → listContactGroups
 */
function listContactGroups() {
  try {
    const groups = People.ContactGroups.list({
      pageSize: 1000
    });
    
    Logger.log('=== ALL CONTACT GROUPS ===');
    
    if (groups.contactGroups) {
      groups.contactGroups.forEach(group => {
        Logger.log('- ' + (group.formattedName || group.name) + ' (' + group.resourceName + ')');
        Logger.log('  Members: ' + (group.memberCount || 0));
      });
      
      SpreadsheetApp.getUi().alert(
        'Found ' + groups.contactGroups.length + ' contact groups\n\n' +
        'Check the Execution log for details'
      );
    } else {
      Logger.log('No contact groups found');
      SpreadsheetApp.getUi().alert('No contact groups found');
    }
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error:\n\n' + error.toString());
  }
}

