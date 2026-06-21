import { useEffect, useRef, useState } from 'react'

// 텍스트가 바뀌면 처음부터 한 글자씩 타이핑하듯 출력한다.
export default function Typewriter({
  text,
  speed = 95,
  onDone,
}: {
  text: string
  speed?: number
  onDone?: () => void
}) {
  const [shown, setShown] = useState('')
  const timer = useRef<number | undefined>(undefined)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    setShown('')
    let i = 0
    if (timer.current) window.clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      i++
      setShown(text.slice(0, i))
      if (i >= text.length && timer.current) {
        window.clearInterval(timer.current)
        doneRef.current?.() // 다 쳤을 때 알림
      }
    }, speed)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [text, speed])

  const typing = shown.length < text.length
  return (
    <>
      {shown}
      {typing && <span className="caret">▍</span>}
    </>
  )
}
