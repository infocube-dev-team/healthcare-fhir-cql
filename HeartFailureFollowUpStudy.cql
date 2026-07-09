library HeartFailureFollowUpStudy version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

// ─── Time Anchor ─────────────────────────────────────────────────────────────

define startEncounter: Last([Encounter] E sort by period.start.value).period.start

// ─── General Eligibility Criteria ─────────────────────────────────────────────

define "Is At Least 18 Years Old":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'is_at_least_18_years_old' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Had Cardiology Visit Last Year":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'had_cardiology_visit_last_year' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define IsEligible:
  "Is At Least 18 Years Old" 
    and "Had Cardiology Visit Last Year"

// ─── Study Groups ────────────────────────────────────────────────────────────

define "Had HF Hospitalization Last 6M":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'had_hf_hospitalization_last_6m' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Eligible For Recent Hospitalization Group":
  IsEligible 
    and "Had HF Hospitalization Last 6M"

define "Eligible For Outpatient Management Group":
  IsEligible 
    and not "Eligible For Recent Hospitalization Group"

// ─── Recent Hospitalization Subprograms ───────────────────────────────────────

define "Agrees To Monthly Follow Up":
  exists([Observation] O 
    where O.code.coding[0].code.value = 'agrees_monthly_follow_up' 
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Eligible For Enhanced Monitoring Program":
  "Eligible For Recent Hospitalization Group" 
    and "Agrees To Monthly Follow Up"

define "Eligible For Standard Monitoring Program":
  "Eligible For Recent Hospitalization Group" 
    and not "Eligible For Enhanced Monitoring Program"

define attributeStats:
  false
