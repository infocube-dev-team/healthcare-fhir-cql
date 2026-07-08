library BloodPressureStabilizationProtocolBPSPLib version '1.1.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

// ─── Time Anchor ─────────────────────────────────────────────────────────────

define startEncounter: Last([Encounter] E sort by period.start.value).period.start

// ─── Therapy Assignment Criteria ──────────────────────────────────────────────

define IsEligible:
  exists([Observation] O
    where O.code.coding[0].code.value = 'agrees_to_weekly_monitoring'
      and O.issued.value >= startEncounter.value
      and O.value = true)

define attributeStats:
  false
