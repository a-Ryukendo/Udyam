import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
export const app = express();

app.use(cors());
app.use(express.json());

const scraperOutputPath = path.resolve(
  process.cwd(),
  '..',
  'scraper',
  'output',
  'udyam_steps.json'
);
const bundledSchemaPath = path.resolve(process.cwd(), 'assets', 'udyam_steps.json');

function loadFormSchema(): any {
  if (fs.existsSync(scraperOutputPath)) {
    return JSON.parse(fs.readFileSync(scraperOutputPath, 'utf-8'));
  }
  return JSON.parse(fs.readFileSync(bundledSchemaPath, 'utf-8'));
}

const AadhaarStepSchema = z.object({
  aadhaarNumber: z.string().regex(/^\d{12}$/),
  entrepreneurName: z.string().min(1),
  consent: z.literal(true),
  pinCode: z.string().regex(/^\d{6}$/)
});

const PanStepSchema = z.object({
  pan: z.string().regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/)
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/schema', (_req, res) => {
  try {
    const schema = loadFormSchema();
    res.json(schema);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load schema' });
  }
});

app.post('/api/validate', (req, res) => {
  const stepId: unknown = req.body?.stepId;
  const data: unknown = req.body?.data;

  if (stepId !== 'aadhaar_otp' && stepId !== 'pan_validation') {
    return res.status(400).json({ error: 'Unknown stepId' });
  }

  const schema = stepId === 'aadhaar_otp' ? AadhaarStepSchema : PanStepSchema;
  const result = schema.safeParse(data);

  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten() });
  }

  res.json({ ok: true });
});

app.post('/api/submit', async (req, res) => {
  const payload = z
    .object({
      aadhaarNumber: z.string().regex(/^\d{12}$/).optional(),
      entrepreneurName: z.string().min(1).optional(),
      consent: z.boolean().optional(),
      pinCode: z.string().regex(/^\d{6}$/).optional(),
      pan: z.string().regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/).optional(),
      stepId: z.enum(['aadhaar_otp', 'pan_validation'])
    })
    .safeParse(req.body);

  if (!payload.success) {
    return res.status(400).json({ errors: payload.error.flatten() });
  }

  try {
    const record = await prisma.udyamSubmission.create({
      data: {
        stepId: payload.data.stepId,
        aadhaarNumber: payload.data.aadhaarNumber ?? null,
        entrepreneurName: payload.data.entrepreneurName ?? null,
        consent: payload.data.consent ?? null,
        pan: payload.data.pan ?? null
      }
    });
    res.json({ ok: true, id: record.id });
  } catch (err) {
    res.status(500).json({ error: 'Database error', detail: String(err) });
  }
});
