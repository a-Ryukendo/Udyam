import { useEffect, useState } from 'react'

export type PinInfo = { city: string; state: string } | null

export function usePinLookup(pin: string) {
  const [info, setInfo] = useState<PinInfo>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!/^\d{6}$/.test(pin)) {
      setInfo(null)
      setError(null)
      return
    }
    let aborted = false
    setLoading(true)
    setError(null)
    fetch(`https://api.postalpincode.in/pincode/${pin}`)
      .then((r) => r.json())
      .then((data) => {
        if (aborted) return
        const first = Array.isArray(data) ? data[0] : null
        const post = first?.PostOffice?.[0]
        if (post) setInfo({ city: post.District, state: post.State })
        else setInfo(null)
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
    return () => {
      aborted = true
    }
  }, [pin])

  return { info, loading, error }
}
