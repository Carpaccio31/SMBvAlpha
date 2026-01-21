
import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

type Props = { onDetected: (value: string) => void }

export default function Scanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let reader: BrowserMultiFormatReader | null = null
    let raf: number | null = null

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      } catch (err) {
        return
      }
      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      // @ts-ignore
      if ('BarcodeDetector' in window) {
        // @ts-ignore
        const detector = new BarcodeDetector({ formats: ['ean-13', 'ean-8', 'upc-e', 'code-128'] })
        const scan = async () => {
          if (!videoRef.current) return
          try {
            const bitmap = await createImageBitmap(videoRef.current)
            const codes = await detector.detect(bitmap)
            if (codes && codes[0]?.rawValue) onDetected(codes[0].rawValue)
          } catch {}
          raf = requestAnimationFrame(scan)
        }
        raf = requestAnimationFrame(scan)
      } else {
        setUsingFallback(true)
        reader = new BrowserMultiFormatReader()
        reader.decodeFromVideoDevice(undefined, videoRef.current!, (res, err) => {
          if (res?.getText()) onDetected(res.getText())
        })
      }
    }

    start()
    return () => {
      if (raf) cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      reader?.reset()
    }
  }, [onDetected])

  return (
    <div>
      <video ref={videoRef} style={{ width: '100%', borderRadius: 8 }} playsInline muted />
      <small>{usingFallback ? 'ZXing scanner active' : 'Native barcode scanner active (if supported)'}</small>
    </div>
  )
}
