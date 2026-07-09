library PrediabetesPreventionStudy version '1.0.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

// ─── Time Anchor ─────────────────────────────────────────────────────────────

define startEncounter: Last([Encounter] E sort by period.start.value).period.start

// ─── General Eligibility Criteria ─────────────────────────────────────────────

define "Is Between 30 and 75 Years Old":
  exists([Observation] O
    where O.code.coding[0].code.value = 'is_between_30_and_75_years_old'
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Has HbA1c Measurement":
  exists([Observation] O
    where O.code.coding[0].code.value = 'hba1c'
      and O.issued.value >= startEncounter.value)

define IsEligible:
  "Is Between 30 and 75 Years Old"
    and "Has HbA1c Measurement"

// ─── Study Groups ────────────────────────────────────────────────────────────

define latestHbA1c:
  Last(
    [Observation] O
      where O.code.coding[0].code.value = 'hba1c'
        and O.issued.value >= startEncounter.value
      sort by issued.value
  )

define "Eligible For Prediabetes Group":
  IsEligible 
    and exists(latestHbA1c) 
    and (latestHbA1c.value as FHIR.Quantity).value.value >= 5.7
    and (latestHbA1c.value as FHIR.Quantity).value.value <= 6.4

define "Eligible For Normoglycemia Group":
  IsEligible 
    and exists(latestHbA1c) 
    and (latestHbA1c.value as FHIR.Quantity).value.value < 5.7

// ─── Prediabetes Subprograms ──────────────────────────────────────────────────

define "Agrees Nutrition Counseling":
  exists([Observation] O
    where O.code.coding[0].code.value = 'agrees_nutrition_counseling'
      and O.issued.value >= startEncounter.value
      and O.value = true)

define "Eligible For Lifestyle Intervention Program":
  "Eligible For Prediabetes Group"
    and "Agrees Nutrition Counseling"

define "Eligible For Observation Program":
  "Eligible For Prediabetes Group"
    and not "Eligible For Lifestyle Intervention Program"

define attributeStats:
  false
