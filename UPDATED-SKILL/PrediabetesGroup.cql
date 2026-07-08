library PrediabetesGroup version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

define startEncounter: Last([Encounter] E sort by period.start.value).period.start

define latestHbA1c:
  Last(
    [Observation] O
      where O.code.coding[0].code.value = 'hba1c'
        and O.issued.value >= startEncounter.value
      sort by issued.value
  )

define IsEligible:
  exists(latestHbA1c) 
    and (latestHbA1c.value as FHIR.Quantity).value.value >= 5.7
    and (latestHbA1c.value as FHIR.Quantity).value.value <= 6.4

define attributeStats:
  false
