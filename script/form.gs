function onFormSubmit(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pinSheet = ss.getSheetByName('PIN');
  const statusSheet = ss.getSheetByName('Current Status');
  const historySheet = ss.getSheetByName('History');

  // Form values: [timestamp, runnerId, pin, status]
  const timestamp = e.values[0];
  const runnerId = e.values[1].toString().trim();
  const submittedPin = e.values[2].toString().trim();
  const status = e.values[3].toString().trim();

  // Always delete the form response row immediately (keeps Form Responses 1 clean)
  e.range.getSheet().deleteRow(e.range.getRow());

  // Build PIN map from PIN sheet (Column A = runnerId, Column B = pin)
  const lastPinRow = pinSheet.getLastRow();
  if (lastPinRow < 2) return;
  const pinData = pinSheet.getRange(2, 1, lastPinRow - 1, 2).getValues();
  const pins = {};
  pinData.forEach(row => {
    const id = row[0].toString().trim();
    const pin = row[1].toString().trim();
    if (id && pin) pins[id] = pin;
  });

  // Validate PIN — stop here if invalid
  if (pins[runnerId] !== submittedPin) return;

  // Valid — update Current Status sheet
  const isActive = status === 'Active' ? 'TRUE' : 'FALSE';
  updateCurrentStatus(statusSheet, runnerId, isActive);

  // Log to History sheet
  historySheet.appendRow([timestamp, runnerId, status]);
}

function updateCurrentStatus(sheet, runnerId, isActive) {
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0].toString().trim() === runnerId) {
        sheet.getRange(i + 2, 2).setValue(isActive);
        return;
      }
    }
  }
  // Runner not in sheet yet — add new row
  sheet.appendRow([runnerId, isActive]);
}