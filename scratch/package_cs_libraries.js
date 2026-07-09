const fs = require('fs');
const path = require('path');

const libraries = [
  { id: 'cancer-screening-study', file: 'CancerScreeningStudy.cql', outFile: 'CancerScreeningStudy-Library.json' },
  { id: 'cancer-screening-overdue-group', file: 'CancerScreeningOverdueGroup.cql', outFile: 'CancerScreeningOverdueGroup-Library.json' },
  { id: 'cancer-screening-up-to-date-group', file: 'CancerScreeningUpToDateGroup.cql', outFile: 'CancerScreeningUpToDateGroup-Library.json' },
  { id: 'cancer-screening-colonoscopy-pathway', file: 'CancerScreeningColonoscopyPathway.cql', outFile: 'CancerScreeningColonoscopyPathway-Library.json' },
  { id: 'cancer-screening-stool-testing-pathway', file: 'CancerScreeningStoolTestingPathway.cql', outFile: 'CancerScreeningStoolTestingPathway-Library.json' }
];

libraries.forEach(lib => {
  const cqlPath = path.join(__dirname, '..', lib.file);
  const outPath = path.join(__dirname, '..', lib.outFile);
  
  if (!fs.existsSync(cqlPath)) {
    console.error(`File not found: ${cqlPath}`);
    return;
  }
  
  const cqlContent = fs.readFileSync(cqlPath, 'utf8');
  const base64Data = Buffer.from(cqlContent).toString('base64');
  
  const resource = {
    resourceType: "Library",
    id: lib.id,
    version: "1.0.0",
    status: "active",
    type: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/library-type",
          code: "logic-library"
        }
      ]
    },
    content: [
      {
        contentType: "text/cql",
        data: base64Data
      }
    ]
  };
  
  fs.writeFileSync(outPath, JSON.stringify(resource, null, 2), 'utf8');
  console.log(`Packaged ${lib.file} -> ${lib.outFile}`);
});
