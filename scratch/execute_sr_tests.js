const fs = require('fs');
const path = require('path');

const SANDBOX_URL = 'https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql';

const testLibraries = [
  { name: 'General Study Eligibility', file: 'PostSurgeryRecoveryStudy.cql' },
  { name: 'Complication Group', file: 'PostSurgeryRecoveryComplicationGroup.cql' },
  { name: 'Routine Recovery Group', file: 'PostSurgeryRecoveryRoutineRecoveryGroup.cql' },
  { name: 'Enhanced Recovery Program', file: 'PostSurgeryRecoveryEnhancedRecoveryProgram.cql' },
  { name: 'Standard Recovery Program', file: 'PostSurgeryRecoveryStandardRecoveryProgram.cql' }
];

const testPatients = [
  { id: 'patient-sr-ineligible-no-surgery', file: 'patient-sr-ineligible-no-surgery.json' },
  { id: 'patient-sr-ineligible-unable-followup', file: 'patient-sr-ineligible-unable-followup.json' },
  { id: 'patient-sr-routine-recovery', file: 'patient-sr-routine-recovery.json' },
  { id: 'patient-sr-complication-enhanced', file: 'patient-sr-complication-enhanced.json' },
  { id: 'patient-sr-complication-standard', file: 'patient-sr-complication-standard.json' }
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
  console.log('Running test matrix for all 5 CQL files and 5 patients...\n');
  
  // Header row
  const libHeaders = testLibraries.map(l => l.name.padEnd(28)).join(' | ');
  console.log('Patient ID'.padEnd(40) + ' | ' + libHeaders);
  console.log('-'.repeat(40 + 3 + testLibraries.length * 31));

  for (const patient of testPatients) {
    const results = [];
    for (const lib of testLibraries) {
      const outcome = await runTest(lib, patient);
      results.push(String(outcome).padEnd(28));
    }
    console.log(patient.id.padEnd(40) + ' | ' + results.join(' | '));
  }
  console.log();
}

runAll().catch(console.error);
