const fs = require('fs');
const path = require('path');

const SANDBOX_URL = 'https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql';

const libraries = [
  { name: 'GeneralEligibility', file: '../GeneralEligibility.cql' },
  { name: 'CardiovascularRiskStudy', file: '../CardiovascularRiskStudy.cql' },
  { name: 'StandardMonitoringStudy', file: '../StandardMonitoringStudy.cql' },
  { name: 'BPSP_Therapy', file: '../BPSP_Therapy.cql' },
  { name: 'LDMP_Therapy', file: '../LDMP_Therapy.cql' }
];

const testPatients = [
  { id: 'patient-eligible-bpsp', file: 'patient-eligible-bpsp.json' },
  { id: 'patient-eligible-ldmp', file: 'patient-eligible-ldmp.json' },
  { id: 'patient-eligible-standard-no-ht', file: 'patient-eligible-standard-no-ht.json' },
  { id: 'patient-eligible-standard-short-bp', file: 'patient-eligible-standard-short-bp.json' },
  { id: 'patient-ineligible-younger-no-caregiver', file: 'patient-ineligible-younger-no-caregiver.json' }
];

async function evaluate(libName, libPath, patient) {
  const patientFile = path.join(__dirname, patient.file);
  const cqlContent = fs.readFileSync(path.join(__dirname, libPath), 'utf8');
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

    if (!response.ok) {
      console.error(`  [${libName}] HTTP Error ${response.status}: ${await response.text()}`);
      return;
    }

    const result = await response.json();
    if (result.resourceType === 'OperationOutcome') {
      console.error(`  [${libName}] Compile/Execution Error:`, JSON.stringify(result, null, 2));
      return;
    }

    const isEligibleParam = result.parameter.find(p => p.name === 'IsEligible');
    const isEligibleVal = isEligibleParam ? isEligibleParam.valueBoolean : 'N/A';
    console.log(`  - ${libName}: ${isEligibleVal}`);
  } catch (error) {
    console.error(`  [${libName}] Error during request:`, error.message);
  }
}

async function run() {
  for (const patient of testPatients) {
    console.log(`\n======================================================`);
    console.log(`Evaluating Patient: ${patient.id}`);
    console.log(`======================================================`);
    for (const lib of libraries) {
      await evaluate(lib.name, lib.file, patient);
    }
  }
}

run().catch(console.error);
