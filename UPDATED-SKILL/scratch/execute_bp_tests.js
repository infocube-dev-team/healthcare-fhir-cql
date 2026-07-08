const fs = require('fs');
const path = require('path');

const CQL_PATH = path.join(__dirname, '..', 'BloodPressureEligibility.cql');
const SANDBOX_URL = 'https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql';

const testPatients = [
  { id: 'patient-bp-eligible', file: 'patient-bp-eligible.json', expected: { 'Is Adult': true, 'Has High Blood Pressure': true, 'isEligible': true } },
  { id: 'patient-bp-too-young', file: 'patient-bp-too-young.json', expected: { 'Is Adult': false, 'Has High Blood Pressure': true, 'isEligible': false } },
  { id: 'patient-bp-low-bp', file: 'patient-bp-low-bp.json', expected: { 'Is Adult': true, 'Has High Blood Pressure': false, 'isEligible': false } }
];

async function runTest(patient) {
  const patientFile = path.join(__dirname, patient.file);
  if (!fs.existsSync(patientFile)) {
    console.error(`Patient file ${patient.file} does not exist.`);
    return;
  }

  const cqlContent = fs.readFileSync(CQL_PATH, 'utf8');
  const patientData = JSON.parse(fs.readFileSync(patientFile, 'utf8'));

  const body = {
    resourceType: 'Parameters',
    parameter: [
      { name: 'subject', valueString: `Patient/${patient.id}` },
      { name: 'content', valueString: cqlContent },
      { name: 'data', resource: patientData }
    ]
  };

  console.log(`\n======================================================`);
  console.log(`Running test for Patient: ${patient.id}`);
  console.log(`======================================================`);

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
      console.error(`HTTP Error: ${response.status} ${response.statusText}`);
      console.error(text);
      return;
    }

    const result = JSON.parse(text);

    // Check for translation/execution errors in response
    if (result.resourceType === 'OperationOutcome') {
      console.error('Error returned by reference engine:');
      console.error(JSON.stringify(result, null, 2));
      return;
    }

    if (result.parameter) {
      console.log(`Results for ${patient.id}:`);
      let allMatched = true;
      result.parameter.forEach(p => {
        let val = 'unknown';
        if (p.valueBoolean !== undefined) val = p.valueBoolean;
        else if (p.valueInteger !== undefined) val = p.valueInteger;
        else if (p.valueString !== undefined) val = p.valueString;
        else if (p.resource) val = `Resource: ${p.resource.resourceType}/${p.resource.id}`;
        
        const expectedVal = patient.expected[p.name];
        const match = expectedVal === undefined ? '' : (expectedVal === val ? '✅ PASS' : `❌ FAIL (Expected: ${expectedVal})`);
        console.log(`  - ${p.name}: ${val} ${match}`);
        if (expectedVal !== undefined && expectedVal !== val) {
          allMatched = false;
        }
      });
      if (allMatched) {
        console.log(`🎉 All expected values matched for ${patient.id}!`);
      } else {
        console.log(`⚠️ Some mismatch occurred for ${patient.id}.`);
      }
    } else {
      console.log('No parameters in response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error(`Error during request for ${patient.id}:`, error);
  }
}

async function runAll() {
  for (const patient of testPatients) {
    await runTest(patient);
  }
}

runAll().catch(console.error);
