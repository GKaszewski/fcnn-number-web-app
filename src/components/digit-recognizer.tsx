import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SwitchCamera } from "lucide-react";

export default function DigitRecognizer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [prediction, setPrediction] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Media Devices API not supported");
    }
  }, []);

  const initCamera = (mode: "user" | "environment") => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    setFacingMode(mode);
    setStarted(true);

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: mode } } })
      .then((stream) => {
        const video = videoRef.current!;
        video.srcObject = stream;
        video.play().catch(() => {});
      })
      .catch((err) => {
        toast.error(`Cannot open camera: ${err.message}`);
      });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;

      if (!video || !canvas || !overlay) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const vRect = video.getBoundingClientRect();
      const oRect = overlay.getBoundingClientRect();
      const scaleX = video.videoWidth / vRect.width;
      const scaleY = video.videoHeight / vRect.height;
      const sx = (oRect.left - vRect.left) * scaleX;
      const sy = (oRect.top - vRect.top) * scaleY;
      const sw = oRect.width * scaleX;
      const sh = oRect.height * scaleY;

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 28, 28);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const data = new FormData();
        data.append("file", blob, "frame.png");

        fetch("/api/predict", {
          method: "POST",
          body: data,
        })
          .then((res) => res.json())
          .then((json) => {
            setPrediction(json.digit);
            setConfidence(json.confidence);
          })
          .catch((err) => toast.error(`Error predicting digit: ${err}`));
      }, "image/png");
    }, 1000);

    return () => clearInterval(interval);
  }, [started]);

  const switchCamera = () => {
    initCamera(facingMode === "user" ? "environment" : "user");
  };

  const confidenceColor = useMemo(() => {
    if (confidence == null) return "text-gray-500";
    if (confidence > 0.75) return "text-green-500";
    if (confidence > 0.5) return "text-yellow-500";
    return "text-red-500";
  }, [confidence]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full min-h-screen h-full bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {!started && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button onClick={() => initCamera("user")}>Start camera</Button>
        </div>
      )}

      {started && (
        <>
          <div className="absolute top-4 right-4 flex space-x-2">
            <Button
              size="icon"
              onClick={switchCamera}
              aria-label="Switch Camera"
            >
              <SwitchCamera />
            </Button>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              ref={overlayRef}
              className="border-4 border-white/50 w-[200px] h-[200px]"
            />
          </div>
          <div className="absolute bottom-8 bg-white/10 backdrop-blur-2xl p-4 rounded-2xl text-center">
            <p className="text-xl font-bold text-green-500">
              Digit: {prediction ?? "..."}
            </p>
            <p className={`text-sm ${confidenceColor}`}>
              Confidence:{" "}
              {confidence !== null
                ? (confidence * 100).toFixed(2) + "%"
                : "..."}
            </p>
          </div>
        </>
      )}

      <canvas
        ref={canvasRef}
        width={28}
        height={28}
        className="z-10 absolute bottom-10 left-10 hidden"
      />
    </div>
  );
}
