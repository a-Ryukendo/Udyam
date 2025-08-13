import request from 'supertest'
import { app } from '../src/app'

describe('API', () => {
  it('health works', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('validates PAN format', async () => {
    const res = await request(app)
      .post('/api/validate')
      .send({ stepId: 'pan_validation', data: { pan: 'ABCDE1234F' } })
    expect(res.status).toBe(200)
  })

  it('rejects invalid PAN', async () => {
    const res = await request(app)
      .post('/api/validate')
      .send({ stepId: 'pan_validation', data: { pan: 'BADPAN' } })
    expect(res.status).toBe(400)
    expect(res.body.errors).toBeTruthy()
  })
})
