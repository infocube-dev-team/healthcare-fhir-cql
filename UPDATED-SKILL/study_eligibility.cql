library StudyEligibilityV3IRCCS version '1.2.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

// ─── Time Anchor ─────────────────────────────────────────────────────────────

define startEncounter: Last([Encounter] E sort by period.start.value).period.start

// ─── General Eligibility Criteria ─────────────────────────────────────────────

define "Is At Least 65 Years Old":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'is_at_least_65_years_old' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Has Legally Authorized Caregiver":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'has_legally_authorized_caregiver' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Age and Caregiver Criteria":
  "Is At Least 65 Years Old" 
    or (not "Is At Least 65 Years Old" and "Has Legally Authorized Caregiver")

define "Can Provide Informed Consent":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'can_provide_informed_consent' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Has Authorized Representative Consent":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'has_authorized_representative_consent' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Consent Criteria":
  ( "Is At Least 65 Years Old" and ("Can Provide Informed Consent" or "Has Authorized Representative Consent") )
    or ( not "Is At Least 65 Years Old" and "Has Authorized Representative Consent" )

define "Is Hemodynamically Stable":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'is_hemodynamically_stable' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Is Receiving Investigational Drug":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'is_receiving_investigational_drug' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Has Condition Preventing Attendance":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'has_condition_preventing_attendance' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Has Caregiver Ensuring Compliance":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'has_caregiver_ensuring_compliance' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Attendance Criteria":
  not "Has Condition Preventing Attendance" or "Has Caregiver Ensuring Compliance"

define "Meets General Eligibility":
  "Age and Caregiver Criteria"
    and "Consent Criteria"
    and "Is Hemodynamically Stable"
    and not "Is Receiving Investigational Drug"
    and "Attendance Criteria"

// ─── Group Study Assignment ──────────────────────────────────────────────────

define "Elevated Blood Pressure At Least 6 Months":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'elevated_bp_at_least_6_months' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Elevated Blood Pressure Less Than 6 Months":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'elevated_bp_less_than_6_months' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Has Hypertension":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'has_hypertension' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Eligible For Cardiovascular Risk Study":
  "Meets General Eligibility" and "Elevated Blood Pressure At Least 6 Months"

define "Eligible For Standard Monitoring Study":
  "Meets General Eligibility" 
    and (not "Has Hypertension" or "Elevated Blood Pressure Less Than 6 Months")

// ─── First-Line Therapy Eligibility ──────────────────────────────────────────

define "Agrees to Weekly Monitoring and Adherence":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'agrees_weekly_monitoring_and_adherence' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Has Caregiver Ensuring Adherence":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'has_caregiver_ensuring_adherence' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Eligible For BPSP":
  "Eligible For Cardiovascular Risk Study"
    and ("Agrees to Weekly Monitoring and Adherence" or "Has Caregiver Ensuring Adherence")

define "Eligible For LDMP":
  "Eligible For Cardiovascular Risk Study" and not "Eligible For BPSP"

define attributeStats:
  false
