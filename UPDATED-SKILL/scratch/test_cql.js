const fs = require('fs');

async function test(subjectId, patientFile) {
  const cql = fs.readFileSync('D:/InfoCube/SKILL/UPDATED-SKILL/scratch/chain_smoker.cql', 'utf8');
  const patientData = JSON.parse(fs.readFileSync('D:/InfoCube/SKILL/UPDATED-SKILL/scratch/' + patientFile, 'utf8'));

  const body = {
    resourceType: 'Parameters',
    parameter: [
      { name: 'subject', valueString: 'Patient/' + subjectId },
      { name: 'content', valueString: cql },
      { name: 'data', resource: patientData }
    ]
  };

  console.log(`Sending request for ${subjectId}...`);
  try {
    const response = await fetch('https://cloud.alphora.com/sandbox/r4/cds/fhir/$cql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error(`HTTP error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(text);
      return;
    }

    const resJson = await response.json();
    console.log(`Response for ${subjectId}:`);
    console.log(JSON.stringify(resJson, null, 2));
  } catch (err) {
    console.error(`Error sending request for ${subjectId}:`, err);
  }
}

async function run() {
  await test('chain-smoker-patient', 'patient_chain_smoker.json');
  console.log('\n----------------------------------------\n');
  await test('control-patient', 'patient_control.json');
}

run();
