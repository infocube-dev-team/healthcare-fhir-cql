library OsteoporosisScreeningStudy version '1.1.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

// ─── Time Anchor ─────────────────────────────────────────────────────────────

define startEncounter: Last([Encounter] E sort by period.start.value).period.start

// ─── General Eligibility Criteria ─────────────────────────────────────────────

define "Is At Least 50 Years Old":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'is_at_least_50_years_old' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Can Provide Informed Consent":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'can_provide_informed_consent' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define IsEligible:
  "Is At Least 50 Years Old" 
    and "Can Provide Informed Consent"

// ─── High-Risk vs Moderate-Risk ──────────────────────────────────────────────

define "Has Previous Fragility Fracture":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'has_previous_fragility_fracture' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Has Osteoporosis Diagnosis":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'has_osteoporosis_diagnosis' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Eligible For High-Risk Group":
  IsEligible 
    and ("Has Previous Fragility Fracture" or "Has Osteoporosis Diagnosis")

define "Eligible For Moderate-Risk Group":
  IsEligible 
    and not "Eligible For High-Risk Group"

// ─── High-Risk Subprograms ───────────────────────────────────────────────────

define "Is Receiving Osteoporosis Medication":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'is_receiving_osteoporosis_medication' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Eligible For Bone Health Management Program":
  "Eligible For High-Risk Group" 
    and "Is Receiving Osteoporosis Medication"

define "Eligible For Screening Program":
  "Eligible For High-Risk Group" 
    and not "Is Receiving Osteoporosis Medication"

define attributeStats:
  false
