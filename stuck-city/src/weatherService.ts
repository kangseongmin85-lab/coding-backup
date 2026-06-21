// 접속 지역 날씨 (서버가 Cloudflare geo + Open-Meteo로 판단)

export type Weather = {
  weather: 'clear' | 'cloud' | 'rain' | 'snow'
  isDay: boolean
  temp?: number | null
  city?: string | null
}

function base(): string {
  return import.meta.env.DEV ? 'http://localhost:8787' : ''
}

export async function fetchWeather(): Promise<Weather | null> {
  try {
    const r = await fetch(`${base()}/api/weather`)
    if (!r.ok) throw new Error(`http ${r.status}`)
    return (await r.json()) as Weather
  } catch {
    return null
  }
}
