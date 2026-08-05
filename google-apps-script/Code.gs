/**
 * JW Web -> Google Sheet sync target.
 *
 * Setup:
 *   1. Open the destination Google Sheet -> Extensions -> Apps Script.
 *   2. Paste this file over Code.gs.
 *   3. Set SHARED_SECRET below to the same value as GSHEET_WEBHOOK_SECRET in Vercel.
 *   4. Deploy -> New deployment -> Web app.
 *        Execute as: Me.  Who has access: Anyone.
 *   5. Copy the /exec URL into GSHEET_WEBHOOK_URL in Vercel.
 *
 * "Anyone" is required because Vercel calls this without a Google identity;
 * the shared secret in the POST body is what actually authorises the write.
 */

var SHARED_SECRET = 'CHANGE_ME';
var SHEET_NAME = 'JW Data';

var HEADERS = [
  'Month', 'MFG Type', 'Plant', 'Production (kgs)', 'Revenue', 'Actual JW/kg',
  'No. of Days Working', 'Monthly Manpower', 'PPP', 'Job work', 'Electricity',
  'Rent', 'Reimbursement', 'Fixed costs', 'Total Cost', 'JW % of rev', 'Updated at'
];

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    if (payload.secret !== SHARED_SECRET) {
      return json({ ok: false, error: 'Bad secret' });
    }

    var sheet = getSheet();
    var rows = payload.rows || [];

    if (payload.mode === 'replace') {
      replaceAll(sheet, rows);
    } else {
      for (var i = 0; i < rows.length; i++) {
        upsertRow(sheet, rows[i]);
      }
    }

    return json({ ok: true, rowCount: rows.length });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function getSheet() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function toArray(row) {
  return [
    row.month_label, row.mfg_type, row.plant, num(row.production_kgs), num(row.revenue),
    num(row.actual_jw_per_kg), num(row.working_days), num(row.man_days), num(row.ppp),
    num(row.job_work), num(row.electricity), num(row.rent), num(row.reimbursement),
    num(row.fixed_cost), num(row.total_cost), num(row.jw_pct_of_rev), row.updated_at
  ];
}

function num(value) {
  if (value === null || value === undefined || value === '') return '';
  var parsed = Number(value);
  return isNaN(parsed) ? '' : parsed;
}

function replaceAll(sheet, rows) {
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).clearContent();
  }
  if (rows.length === 0) return;

  var values = rows.map(toArray);
  sheet.getRange(2, 1, values.length, HEADERS.length).setValues(values);
}

/** Month + Plant is the natural key, matching the unique constraint in Postgres. */
function upsertRow(sheet, row) {
  var values = toArray(row);
  var lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    var keys = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i][0]) === String(row.month_label) &&
          String(keys[i][2]) === String(row.plant)) {
        sheet.getRange(i + 2, 1, 1, HEADERS.length).setValues([values]);
        return;
      }
    }
  }

  sheet.getRange(lastRow + 1, 1, 1, HEADERS.length).setValues([values]);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
