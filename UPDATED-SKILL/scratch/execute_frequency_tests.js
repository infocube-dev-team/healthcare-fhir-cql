const fs = require('fs');
const path = require('path');

const SANDBOX_URL = 'https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql';

const testPatients = [
  { id: 'patient-frequency-eligible', file: 'patient-frequency-eligible.json' },
  { id: 'patient-frequency-control', file: 'patient-frequency-control.json' }
];

async function runTest(patient) {
  const patientFile = path.join(__dirname, patient.file);
  const cqlContent = fs.readFileSync(path.join(__dirname, '..', 'FrequencyOfUseEligibility.cql'), 'utf8');
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

    if (result.resourceType === 'OperationOutcome') {
      console.error('Error returned by reference engine:');
      console.error(JSON.stringify(result, null, 2));
      return;
    }

    if (result.parameter) {
      result.parameter.forEach(p => {
        let val = 'unknown';
        if (p.valueBoolean !== undefined) val = p.valueBoolean;
        else if (p.valueInteger !== undefined) val = p.valueInteger;
        else if (p.valueString !== undefined) val = p.valueString;
        else if (p.resource) val = `Resource: ${p.resource.resourceType}/${p.resource.id}`;
        
        console.log(`  - ${p.name}: ${val}`);
      });
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
