const fs = require('fs');
const path = require('path');

const SANDBOX_URL = 'https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql';

async function run() {
  const patientFile = path.join(__dirname, 'patient-frequency-eligible.json');
  const cqlContent = fs.readFileSync(path.join(__dirname, '..', 'FrequencyOfUseEligibility.cql'), 'utf8');
  const patientData = JSON.parse(fs.readFileSync(patientFile, 'utf8'));

  const body = {
    resourceType: 'Parameters',
    parameter: [
      { name: 'subject', valueString: `Patient/patient-frequency-eligible` },
      { name: 'content', valueString: cqlContent },
      { name: 'data', resource: patientData }
    ]
  };

  const response = await fetch(SANDBOX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/fhir+json',
      'Accept': 'application/fhir+json'
    },
    body: JSON.stringify(body)
  });

  const result = await response.json();
  console.log(JSON.stringify(result, null, 2));
}

run().catch(console.error);
