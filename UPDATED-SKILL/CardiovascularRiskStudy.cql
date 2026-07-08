library CardiovascularRiskStudyLib version '1.1.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

// ─── Time Anchor ─────────────────────────────────────────────────────────────

define startEncounter: Last([Encounter] E sort by period.start.value).period.start

// ─── Study Assignment Criteria ────────────────────────────────────────────────

define IsEligible:
  exists([Observation] O
    where O.code.coding[0].code.value = 'elevated_bp_6m_plus'
      and O.issued.value >= startEncounter.value
      and O.value = true)

define attributeStats:
  false
