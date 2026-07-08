library FullAutoPJLib_OVAVU version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient
define startEncounter: Last([Encounter] E sort by period.start.value).period.start

define IsEligible:
  (
    exists([Observation] O where O.code.coding[0].code.value = 'is_at_least_65_years_old' and O.issued.value >= startEncounter and O.value = true)
    or exists([Observation] O where O.code.coding[0].code.value = 'has_legally_authorized_caregiver' and O.issued.value >= startEncounter and O.value = true)
  )
  and (
    exists([Observation] O where O.code.coding[0].code.value = 'can_provide_informed_consent' and O.issued.value >= startEncounter and O.value = true)
    or exists([Observation] O where O.code.coding[0].code.value = 'has_authorized_representative' and O.issued.value >= startEncounter and O.value = true)
  )
  and exists([Observation] O where O.code.coding[0].code.value = 'is_hemodynamically_stable' and O.issued.value >= startEncounter and O.value = true)
  and exists([Observation] O where O.code.coding[0].code.value = 'is_not_receiving_investigational_drug' and O.issued.value >= startEncounter and O.value = true)
  and (
    exists([Observation] O where O.code.coding[0].code.value = 'has_no_condition_preventing_attendance' and O.issued.value >= startEncounter and O.value = true)
    or exists([Observation] O where O.code.coding[0].code.value = 'has_caregiver_ensuring_compliance' and O.issued.value >= startEncounter and O.value = true)
  )

define attributeStats:false
