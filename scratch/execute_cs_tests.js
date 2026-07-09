const fs = require('fs');
const path = require('path');

const SANDBOX_URL = 'https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql';

const testLibraries = [
  { name: 'General Study Eligibility', file: 'CancerScreeningStudy.cql' },
  { name: 'Overdue Screening Group', file: 'CancerScreeningOverdueGroup.cql' },
  { name: 'Up-to-Date Screening Group', file: 'CancerScreeningUpToDateGroup.cql' },
  { name: 'Colonoscopy Pathway', file: 'CancerScreeningColonoscopyPathway.cql' },
  { name: 'Stool Testing Pathway', file: 'CancerScreeningStoolTestingPathway.cql' }
];

const testPatients = [
  { id: 'patient-cs-ineligible-young', file: 'patient-cs-ineligible-young.json' },
  { id: 'patient-cs-ineligible-history', file: 'patient-cs-ineligible-history.json' },
  { id: 'patient-cs-uptodate', file: 'patient-cs-uptodate.json' },
  { id: 'patient-cs-overdue-colonoscopy', file: 'patient-cs-overdue-colonoscopy.json' },
  { id: 'patient-cs-overdue-stool', file: 'patient-cs-overdue-stool.json' }
];

async function runTest(lib, patient) {
  const cqlPath = path.join(__dirname, '..', lib.file);
  const patientFile = path.join(__dirname, patient.file);
  
  if (!fs.existsSync(cqlPath) || !fs.existsSync(patientFile)) {
    console.error(`Missing file: ${lib.file} or ${patient.file}`);
    return null;
  }

  const cqlContent = fs.readFileSync(cqlPath, 'utf8');
  const patientData = JSON.parse(fs.readFileSync(patientFile, 'utf8'));

  const body = {
    resourceType: 'Parameters',
    parameter: [
      { name: 'subject', valueString: `Patient/${patient.id}` },
      { name: 'content', valueString: cqlContent },
      { name: 'data', resource: patientData }
    ]
  };

  try {
    const response = await fetch(SANDBOX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json'
      },
      body: JSON.stringify(body)
    });

    const text = await response.text();

    if (!response.ok) {
      console.error(`HTTP Error for ${lib.file} on ${patient.id}: ${response.status} ${response.statusText}`);
      console.error(text);
      return 'error';
    }

    const result = JSON.parse(text);

    if (result.resourceType === 'OperationOutcome') {
      console.error(`OperationOutcome error for ${lib.file} on ${patient.id}:`);
      console.error(JSON.stringify(result, null, 2));
      return 'error';
    }

    if (result.parameter) {
      const isEligibleParam = result.parameter.find(p => p.name === 'IsEligible');
      if (isEligibleParam) {
        return isEligibleParam.valueBoolean;
      }
    }
    return 'unknown';
  } catch (error) {
    console.error(`Fetch exception for ${lib.file} on ${patient.id}:`, error);
    return 'error';
  }
}

async function runAll() {
  console.log('Running test matrix for all 5 Cancer Screening CQL files and 5 patients...\n');
  
  // Header row
  const libHeaders = testLibraries.map(l => l.name.padEnd(28)).join(' | ');
  console.log('Patient ID'.padEnd(30) + ' | ' + libHeaders);
  console.log('-'.repeat(30 + 3 + testLibraries.length * 31));

  for (const patient of testPatients) {
    const results = [];
    for (const lib of testLibraries) {
      const outcome = await runTest(lib, patient);
      results.push(String(outcome).padEnd(28));
    }
    console.log(patient.id.padEnd(30) + ' | ' + results.join(' | '));
  }
  console.log();
}

runAll().catch(console.error);
