const fs = require('fs');
const path = require('path');

const CQL_PATH = path.join(__dirname, 'user_test.cql');
const PATIENT_PATH = path.join(__dirname, 'patient-dummy.json');
const SANDBOX_URL = 'https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql';

async function test() {
  const cqlContent = fs.readFileSync(CQL_PATH, 'utf8');
  const patientData = JSON.parse(fs.readFileSync(PATIENT_PATH, 'utf8'));

  const body = {
    resourceType: 'Parameters',
    parameter: [
      { name: 'subject', valueString: 'Patient/patient-dummy' },
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
    console.log("HTTP Status:", response.status);
    console.log("Raw Response:");
    console.log(text);
  } catch (error) {
    console.error("Error during request:", error);
  }
}

test();
