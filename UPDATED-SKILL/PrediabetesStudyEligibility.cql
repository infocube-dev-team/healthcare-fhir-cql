library PrediabetesStudyEligibility version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

define startEncounter: Last([Encounter] E sort by period.start.value).period.start

define "Is Between 30 and 75 Years Old":
  exists([Observation] O
    where O.code.coding[0].code.value = 'is_between_30_and_75_years_old'
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Has HbA1c Measurement":
  exists([Observation] O
    where O.code.coding[0].code.value = 'hba1c'
      and O.issued.value >= startEncounter.value)

define IsEligible:
  "Is Between 30 and 75 Years Old"
    and "Has HbA1c Measurement"

define attributeStats:
  false
