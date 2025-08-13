import { useEffect, useMemo, useState } from 'react'
import './App.css'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { usePinLookup } from './hooks/usePinLookup'

function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host.endsWith('netlify.app')) return '/.netlify/functions/api'
  }
  return '/api'
}

const apiBase = getApiBase()

type Field = {
  id: string
  label: string
  type: 'text' | 'checkbox'
  placeholder?: string
  validation?: {
    required?: boolean
    maxLength?: number
    regex?: string
  }
}

type Step = {
  id: 'aadhaar_otp' | 'pan_validation'
  title: string
  fields: Field[]
  actions: { id: string; label: string; type: 'submit' }[]
}

type SchemaDoc = {
  title: string
  steps: Step[]
}

function buildZodSchema(step: Step) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const f of step.fields) {
    if (f.type === 'checkbox') {
      shape[f.id] = z.boolean().refine((v) => v === true, 'Required')
    } else {
      let s = z.string()
      if (f.validation?.required) s = s.min(1, 'Required')
      if (f.validation?.maxLength) s = s.max(f.validation.maxLength)
      if (f.validation?.regex) s = s.regex(new RegExp(f.validation.regex))
      shape[f.id] = s
    }
  }
  return z.object(shape)
}

export default function App() {
  const [schema, setSchema] = useState<SchemaDoc | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  useEffect(() => {
    axios.get(`${apiBase}/schema`).then((r) => setSchema(r.data))
  }, [])

  const step: Step | null = useMemo(() => {
    if (!schema) return null
    return schema.steps[currentStepIndex]
  }, [schema, currentStepIndex])

  const formSchema = useMemo(() => (step ? buildZodSchema(step) : null), [step])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<any>({ resolver: formSchema ? zodResolver(formSchema) : undefined })

  const pin = watch('pinCode') as string
  const { info: pinInfo } = usePinLookup(pin ?? '')

  if (!schema || !step || !formSchema) return <div style={{ padding: 16 }}>Loading…</div>

  async function onSubmit(values: any) {
    if (!step || !schema) return
    await axios.post(`${apiBase}/validate`, { stepId: step.id, data: values })
    await axios.post(`${apiBase}/submit`, { stepId: step.id, ...values })

    if (currentStepIndex < schema.steps.length - 1) setCurrentStepIndex(currentStepIndex + 1)
    else alert('Submitted')
  }

  return (
    <div style={{ margin: '0 auto', maxWidth: 680, padding: 16 }}>
      <h2 style={{ textAlign: 'center' }}>{schema.title}</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {schema.steps.map((s, i) => (
          <div
            key={s.id}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              background: i === currentStepIndex ? '#0ea5e9' : '#e5e7eb',
              color: i === currentStepIndex ? 'white' : 'black',
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            {`Step ${i + 1}: ${s.title}`}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: 12 }}>
        {step.fields.map((f) => (
          <div key={f.id} style={{ display: 'grid', gap: 6 }}>
            <label htmlFor={f.id} style={{ fontWeight: 600 }}>{f.label}</label>
            {f.type === 'checkbox' ? (
              <input id={f.id} type="checkbox" {...register(f.id)} />
            ) : (
              <input
                id={f.id}
                type="text"
                placeholder={f.placeholder}
                {...register(f.id)}
                style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6 }}
              />
            )}
            {errors[f.id] && (
              <div style={{ color: 'crimson', fontSize: 12 }}>{(errors as any)[f.id]?.message as string}</div>
            )}
            {f.id === 'pinCode' && pinInfo && (
              <div style={{ color: '#334155', fontSize: 12 }}>
                Auto-fill: {pinInfo.city}, {pinInfo.state}
              </div>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {currentStepIndex > 0 && (
            <button type="button" onClick={() => setCurrentStepIndex(currentStepIndex - 1)}>
              Back
            </button>
          )}
          <button type="submit" style={{ marginLeft: 'auto' }}>
            {step.actions[0]?.label ?? 'Next'}
          </button>
        </div>
      </form>

      <p style={{ marginTop: 16, color: '#64748b' }}>
        PAN format enforced: <code>^[A-Za-z]&#123;5&#125;[0-9]&#123;4&#125;[A-Za-z]&#123;1&#125;$</code>
      </p>
    </div>
  )
}
