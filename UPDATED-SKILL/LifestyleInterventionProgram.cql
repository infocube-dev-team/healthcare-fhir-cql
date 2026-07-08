library LifestyleInterventionProgram version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

define startEncounter: Last([Encounter] E sort by period.start.value).period.start

define IsEligible:
  exists([Observation] O
    where O.code.coding[0].code.value = 'agrees_nutrition_counseling'
      and O.issued.value >= startEncounter.value
      and O.value = true)

define attributeStats:
  false
