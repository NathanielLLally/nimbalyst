'use client'

import { useState, useEffect, type FormEvent } from 'react'

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

const SERVICE_TYPES = [
  'Emergency / 24-7 Veterinary Clinics',
  'Specialty & Surgical Veterinary Practices',
  'Franchise / Multi-Location Vet Clinics',
  'Dog Training (Behavioral / Aggression / Board & Train)',
  'Pet Boarding & Daycare (Urban / High-Capacity)',
  'Mobile Veterinary Services',
  'Luxury Pet Sitting (In-Home, Overnight)',
  'High-End Grooming (Breed-specific, Show prep)',
  'Dog Walking (Urban, Recurring Packages)',
  'Pet Transportation / Pet Taxi / Airline-ready transport',
  'Pet Cremation & Memorial Services',
  'Raw / Prescription Pet Food (Local Direct To Consumer)',
  'Pet Photography / Events',
  'Exotic Pet Care (Reptiles, Birds, Small Mammals)',
  'Pet Waste Removal (Pooper Scooper)',
]

const SPECULATION_MODELS = [
  'Conservative',
  'Low-Key Flex',
  'Reliable Prediction',
  'Baller Bracket',
  'Well-Oiled Machine',
]

const LEADS_OPTIONS = ['0', '10', '20', '40']

const REDIRECT_URL = '/pricing'

export function BusinessModelForm({ sourcePage = '/your-business-model' }: { sourcePage?: string }) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [formData, setFormData] = useState({
    serviceType: '',
    speculationModel: SPECULATION_MODELS[0],
    leadsPerMonth: '20',
    activeClients: '10',
  })

  useEffect(() => {
    if (state.kind === 'success') {
      window.location.href = REDIRECT_URL
    }
  }, [state.kind])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const isComplete =
    formData.serviceType !== '' &&
    formData.speculationModel !== '' &&
    formData.leadsPerMonth !== '' &&
    formData.activeClients !== ''

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formEl = event.currentTarget

    if ((new FormData(formEl).get('company_website') as string)?.trim()) {
      setState({ kind: 'success' })
      return
    }

    setState({ kind: 'submitting' })

    try {
      const res = await fetch('/api/business-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: formData.serviceType,
          speculationModel: formData.speculationModel,
          leadsPerMonth: formData.leadsPerMonth,
          activeClients: Number(formData.activeClients),
          meta: { sourcePage },
        }),
      })
      if (!res.ok) throw new Error(`Submission failed (HTTP ${res.status})`)
      setState({ kind: 'success' })
    } catch (e: any) {
      setState({ kind: 'error', message: e?.message || 'Something went wrong.' })
    }
  }

  if (state.kind === 'success') {
    return (
      <div className="lead-form lead-form--success" role="status">
        <h3>Redirecting you to pricing...</h3>
      </div>
    )
  }

  const disabled = state.kind === 'submitting'

  return (
    <form className="lead-form business-model-form" onSubmit={onSubmit} noValidate>
      <div className="lead-form__field">
        <label htmlFor="service-type">Pet Service Type</label>
        <select
          id="service-type"
          name="serviceType"
          value={formData.serviceType}
          onChange={handleChange}
          disabled={disabled}
        >
          <option value="">Select a service type...</option>
          {SERVICE_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="lead-form__field">
        <label htmlFor="speculation-model">Speculation Model</label>
        <select
          id="speculation-model"
          name="speculationModel"
          value={formData.speculationModel}
          onChange={handleChange}
          disabled={disabled}
        >
          {SPECULATION_MODELS.map((model) => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="lead-form__field">
          <label>Incoming Leads per Month</label>
          <div className="form-radio-group">
            {LEADS_OPTIONS.map((opt) => (
              <label key={opt} className="radio-label">
                <input
                  type="radio"
                  name="leadsPerMonth"
                  value={opt}
                  checked={formData.leadsPerMonth === opt}
                  onChange={handleChange}
                  disabled={disabled}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="lead-form__field">
          <label htmlFor="active-clients">Current Active Clients</label>
          <input
            id="active-clients"
            name="activeClients"
            type="number"
            min="0"
            max="300"
            value={formData.activeClients}
            onChange={handleChange}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Honeypot */}
      <div className="lead-form__hp" aria-hidden="true">
        <label>
          Leave this empty
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.kind === 'error' ? (
        <div className="lead-form__error" role="alert">
          {state.message}
        </div>
      ) : null}

      {isComplete && (
        <div className="form-footer-actions">
          <button type="submit" className="lead-form__submit" disabled={disabled}>
            {disabled ? 'Sending…' : 'Calculate & View Pricing'}
          </button>
        </div>
      )}

      <p className="lead-form__legal">GDPR | CAN-Spam compliant</p>
    </form>
  )
}
