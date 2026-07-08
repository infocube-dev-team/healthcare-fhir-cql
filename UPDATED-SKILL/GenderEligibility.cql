library GenderEligibilityLib version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

// ─── Time Anchor ─────────────────────────────────────────────────────────────

define startEncounter: Last([Encounter] E sort by period.start.value).period.start

// ─── Eligibility Criteria ─────────────────────────────────────────────────────

define IsEligible:
  exists([Observation] O
    where O.code.coding[0].code.value = 'gender_question'
      and O.issued.value >= startEncounter.value
      and (O.value as CodeableConcept).coding[0].code.value = 'male')

define attributeStats:
  false
