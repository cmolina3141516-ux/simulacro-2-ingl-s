const SPREADSHEET_ID = '1gBDHqe7sgcyvaoBuU698yKS1OWbPlwuVjQF97A3yt9A';
const SHEET_NAME = 'Responses';

const ANSWER_KEY = {
  module1: [
    'C', 'C', 'B', 'C', 'B', 'A', 'B', 'B', 'A',
    'C', 'D', 'C', 'C', 'C', 'C', 'B', 'C', 'A',
    'D', 'A', 'C', 'A', 'D', 'D', 'B', 'D', 'A'
  ],
  module2: [
    'A', 'C', 'D', 'D', 'A', 'B', 'B', 'D', 'C',
    'D', 'D', 'A', 'D', 'C', 'A', 'B', 'D', 'A',
    'B', 'C', 'D', 'A', 'B', 'A', 'D', 'B', 'A'
  ]
};

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const module1Answers = normalizeAnswers(payload.answers && payload.answers.module1);
  const module2Answers = normalizeAnswers(payload.answers && payload.answers.module2);
  const module1Score = scoreModule(module1Answers, ANSWER_KEY.module1);
  const module2Score = scoreModule(module2Answers, ANSWER_KEY.module2);
  const totalScore = module1Score + module2Score;
  const satEstimate = estimateRwScore(totalScore);
  const satEstimateRange = estimateRwScoreRange(satEstimate);

  const sheet = getResponseSheet();
  ensureHeaders(sheet);

  const row = [
    new Date(),
    payload.testName || 'SAT Reading and Writing Practice Test 2',
    payload.studentName || '',
    payload.studentId || '',
    payload.startedAt || '',
    payload.submittedAt || '',
    `${module1Score}/27`,
    `${module2Score}/27`,
    `${totalScore}/54`,
    satEstimate,
    satEstimateRange,
    ...module1Answers,
    ...module2Answers
  ];

  sheet.appendRow(row);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService
    .createTextOutput('SAT Reading and Writing response endpoint is active.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function getResponseSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = [
      'Timestamp',
      'Test Name',
      'Student Name',
      'Student Email or ID',
      'Started At',
      'Submitted At',
      'Module 1 Score',
      'Module 2 Score',
      'Total Score',
      'SAT Estimate',
      'SAT Estimate Range'
    ];

    for (let i = 1; i <= 27; i += 1) headers.push(`M1_Q${i}`);
    for (let i = 1; i <= 27; i += 1) headers.push(`M2_Q${i}`);

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }

  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const hasSatEstimate = headers.indexOf('SAT Estimate') !== -1;
  const hasSatEstimateRange = headers.indexOf('SAT Estimate Range') !== -1;

  if (!hasSatEstimate && !hasSatEstimateRange) {
    const m1Q1Index = headers.indexOf('M1_Q1');
    const insertBeforeColumn = m1Q1Index === -1 ? 10 : m1Q1Index + 1;
    sheet.insertColumnsBefore(insertBeforeColumn, 2);
    sheet.getRange(1, insertBeforeColumn, 1, 2).setValues([[
      'SAT Estimate',
      'SAT Estimate Range'
    ]]);
  }

  sheet.setFrozenRows(1);
}

function setupSheet() {
  ensureHeaders(getResponseSheet());
}

function normalizeAnswers(answers) {
  const normalized = Array.isArray(answers) ? answers.slice(0, 27) : [];
  while (normalized.length < 27) normalized.push('');
  return normalized.map(answer => String(answer || '').trim().toUpperCase());
}

function scoreModule(studentAnswers, key) {
  return key.reduce((total, correct, index) => {
    return total + (studentAnswers[index] === correct ? 1 : 0);
  }, 0);
}

function estimateRwScore(rawScore) {
  const clampedRawScore = Math.max(0, Math.min(54, Number(rawScore) || 0));
  const center = 200 + (clampedRawScore / 54) * 600;
  return Math.round(center);
}

function estimateRwScoreRange(satEstimate) {
  const low = Math.max(200, satEstimate - 40);
  const high = Math.min(800, satEstimate + 40);
  return `${low}-${high}`;
}
