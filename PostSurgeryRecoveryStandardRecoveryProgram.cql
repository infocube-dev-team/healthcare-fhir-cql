library PostSurgeryRecoveryStandardRecoveryProgram version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

// ─── Time Anchor ─────────────────────────────────────────────────────────────

define startEncounter: Last([Encounter] E sort by period.start.value).period.start

// ─── General Eligibility Criteria ─────────────────────────────────────────────

define "Undergone Elective Surgery Within 30 Days":
  exists([Observation] O
    where O.code.coding[0].code.value = 'undergone_elective_surgery_within_30_days'
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Able To Participate In Follow Up":
  exists([Observation] O
    where O.code.coding[0].code.value = 'able_to_participate_in_follow_up'
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "StudyEligible":
  "Undergone Elective Surgery Within 30 Days"
    and "Able To Participate In Follow Up"

// ─── Group Criteria ──────────────────────────────────────────────────────────

define "Had Postoperative Complication":
  exists([Observation] O
    where O.code.coding[0].code.value = 'postoperative_complication'
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Eligible For Complication Group":
  "StudyEligible"
    and "Had Postoperative Complication"

// ─── Program Criteria ────────────────────────────────────────────────────────

define "Has Caregiver Support":
  exists([Observation] O
    where O.code.coding[0].code.value = 'has_caregiver_support'
      and O.issued.value >= startEncounter.value
      and O.value = true)

define IsEligible:
  "Eligible For Complication Group"
    and not "Has Caregiver Support"

define attributeStats:
  false
