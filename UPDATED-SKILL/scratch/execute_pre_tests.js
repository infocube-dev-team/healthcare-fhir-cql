const fs = require('fs');
const path = require('path');

const SANDBOX_URL = 'https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql';

const libraries = [
  { name: 'PrediabetesStudyEligibility', file: '../PrediabetesStudyEligibility.cql' },
  { name: 'PrediabetesGroup', file: '../PrediabetesGroup.cql' },
  { name: 'NormoglycemiaGroup', file: '../NormoglycemiaGroup.cql' },
  { name: 'LifestyleInterventionProgram', file: '../LifestyleInterventionProgram.cql' },
  { name: 'ObservationProgram', file: '../ObservationProgram.cql' }
];

const testPatients = [
  { id: 'patient-pre-ineligible-young', file: 'patient-pre-ineligible-young.json' },
  { id: 'patient-pre-ineligible-no-hba1c', file: 'patient-pre-ineligible-no-hba1c.json' },
  { id: 'patient-pre-normoglycemia', file: 'patient-pre-normoglycemia.json' },
  { id: 'patient-pre-prediabetes-lifestyle', file: 'patient-pre-prediabetes-lifestyle.json' },
  { id: 'patient-pre-prediabetes-obs', file: 'patient-pre-prediabetes-obs.json' }
];

async function evaluate(libName, libFile, patient) {
  const patientFile = path.join(__dirname, patient.file);
  const cqlContent = fs.readFileSync(path.join(__dirname, libFile), 'utf8');
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
