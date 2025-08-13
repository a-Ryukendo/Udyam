import type { Handler } from '@netlify/functions'
import { z } from 'zod'
import { Client } from 'pg'

const AadhaarStepSchema = z.object({
  aadhaarNumber: z.string().regex(/^\d{12}$/),
  entrepreneurName: z.string().min(1),
  consent: z.literal(true),
  pinCode: z.string().regex(/^\d{6}$/)
})

const PanStepSchema = z.object({
  pan: z.string().regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/)
})

const schemaDoc = {
  title: 'Udyam Registration (Steps 1 & 2)',
  steps: [
    {
      id: 'aadhaar_otp',
      title: 'Aadhaar Verification With OTP',
      fields: [
        { id: 'aadhaarNumber', label: 'Aadhaar Number/ आधार संख्या', type: 'text', placeholder: 'Your Aadhaar No', validation: { regex: '^\\d{12}$', required: true } },
        { id: 'entrepreneurName', label: 'Name of Entrepreneur / उद्यमी का नाम', type: 'text', placeholder: 'Name as per Aadhaar', validation: { required: true, maxLength: 100 } },
        { id: 'pinCode', label: 'PIN Code', type: 'text', placeholder: '6-digit PIN', validation: { regex: '^\\d{6}$', required: true } },
        { id: 'consent', label: 'Consent for using Aadhaar for Udyam Registration', type: 'checkbox', validation: { required: true } }
      ],
      actions: [{ id: 'validate_generate_otp', label: 'Validate & Generate OTP', type: 'submit' }]
    },
    {
      id: 'pan_validation',
      title: 'PAN Validation',
      fields: [
        { id: 'pan', label: 'PAN Number', type: 'text', placeholder: 'Enter PAN', validation: { regex: '^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$', required: true } }
      ],
      actions: [{ id: 'validate_pan', label: 'Validate PAN', type: 'submit' }]
    }
  ]
}

const handler: Handler = async (event) => {
  const base = '/.netlify/functions/api'
  const fullPath = event.path || ''
  const path = fullPath.startsWith(base) ? fullPath.slice(base.length) : fullPath

  if (event.httpMethod === 'GET' && path === '/schema') {
    return json(200, schemaDoc)
  }

  if (event.httpMethod === 'POST' && path === '/validate') {
    const body = parse(event.body)
    if (!body || (body.stepId !== 'aadhaar_otp' && body.stepId !== 'pan_validation')) {
      return json(400, { error: 'Unknown stepId' })
    }
    const s = body.stepId === 'aadhaar_otp' ? AadhaarStepSchema : PanStepSchema
    const result = s.safeParse(body.data)
    if (!result.success) return json(400, { errors: result.error.flatten() })
    return json(200, { ok: true })
  }

  if (event.httpMethod === 'POST' && path === '/submit') {
    const body = parse(event.body)
    const parsed = z.object({
      stepId: z.enum(['aadhaar_otp', 'pan_validation']),
      aadhaarNumber: z.string().regex(/^\d{12}$/).optional(),
      entrepreneurName: z.string().min(1).optional(),
      consent: z.boolean().optional(),
      pinCode: z.string().regex(/^\d{6}$/).optional(),
      pan: z.string().regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/).optional()
    }).safeParse(body)

    if (!parsed.success) return json(400, { errors: parsed.error.flatten() })

    const client = new Client({ connectionString: process.env.DATABASE_URL })
    await client.connect()
    await client.query(
      `CREATE TABLE IF NOT EXISTS "UdyamSubmission" (
        id SERIAL PRIMARY KEY,
        stepId TEXT NOT NULL,
        aadhaarNumber VARCHAR(12),
        entrepreneurName TEXT,
        consent BOOLEAN,
        pinCode VARCHAR(6),
        pan VARCHAR(10),
        createdAt TIMESTAMP DEFAULT NOW()
      );`
    )
    const { stepId, aadhaarNumber, entrepreneurName, consent, pinCode, pan } = parsed.data
    await client.query(
      `INSERT INTO "UdyamSubmission" (stepId, aadhaarNumber, entrepreneurName, consent, pinCode, pan)
       VALUES ($1,$2,$3,$4,$5,$6);`,
      [stepId, aadhaarNumber ?? null, entrepreneurName ?? null, consent ?? null, pinCode ?? null, pan ?? null]
    )
    await client.end()
    return json(200, { ok: true })
  }

  return json(404, { error: 'Not found' })
}

function parse(body: string | null) {
  try { return body ? JSON.parse(body) : null } catch { return null }
}
function json(status: number, data: unknown) {
  return { statusCode: status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }
}
export { handler }