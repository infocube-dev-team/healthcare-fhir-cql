library BloodPressureEligibility version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

// ─── Time Anchor ─────────────────────────────────────────────────────────────
define startEncounter: 
  Last([Encounter] E sort by period.start.value).period.start

// ─── Eligibility Criteria ─────────────────────────────────────────────────────
define "Is Adult":
  exists([Observation] O
    where O.code.coding[0].code.value = 'is_adult'
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Has High Blood Pressure":
  exists([Observation] O
    where O.code.coding[0].code.value = 'blood_pressure'
      and O.issued.value >= startEncounter.value
      and (O.value as FHIR.Quantity).value.value > 80)

define isEligible:
  "Is Adult" and "Has High Blood Pressure"

define attributeStats:
  false
