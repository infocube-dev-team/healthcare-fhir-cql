library EducationEligibilityLib version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

// ─── Time Anchor ─────────────────────────────────────────────────────────────

define startEncounter: Last([Encounter] E sort by period.start.value).period.start

// ─── Eligibility Criteria ─────────────────────────────────────────────────────

define IsEligible:
  exists([Observation] O
    where O.code.coding[0].code.value = 'highest_level_education'
      and O.issued.value >= startEncounter.value
      and (O.value as CodeableConcept).coding[0].code.value = 'postgraduate_degree')

define attributeStats:
  false
