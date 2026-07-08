library ChainSmokerLogic version '2.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

define latestSmokingDuration:
  Last(
    [Observation] O
      where O.code.coding[0].code.value = 'smoking_duration'
      sort by issued.value
  )

define isChainSmoker:
  exists(latestSmokingDuration) and (latestSmokingDuration.value as FHIR.Quantity).value.value > 5.0

define isNotChainSmoker:
  exists(latestSmokingDuration) and (latestSmokingDuration.value as FHIR.Quantity).value.value <= 5.0

define IsEligible:
  isChainSmoker

define attributeStats:
  false
