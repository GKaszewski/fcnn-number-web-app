import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SwitchCamera } from "lucide-react";

export default function DigitRecognizer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      toast.error("Media devices API not supported in this browser");
      return;
    }

    navigator.mediaDevices
      .enumerateDevices()
      .then((all) => {
        const cameras = all.filter((d) => d.kind === "videoinput");
        if (cameras.length === 0) {
          toast.error("No cameras found");
          return;
        }

        setDevices(cameras);
        setSelectedIndex(0);
      })
      .catch((err) => toast.error(`Error accessing devices: ${err}`));
  }, []);

  useEffect(() => {
    if (devices.length === 0) return;
    const deviceId = devices[selectedIndex].deviceId;
    const video = videoRef.current;
    if (video && video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }

    navigator.mediaDevices
      .getUserMedia({
        video: { deviceId: { exact: deviceId } },
      })
      .then((stream) => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      })
      .catch(toast.error);
  }, [devices, selectedIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, 28, 28);
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
          .catch(toast.error);
      }, "image/png");
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const switchCamera = () => {
    setSelectedIndex((i) => (i + 1) % devices.length);
  };

  const getConfidenceColor = () => {
    if (confidence === null) {
      return "text-gray-500";
    }

    if (confidence > 0.75) {
      return "text-green-500";
    }

    if (confidence <= 0.75 && confidence > 0.5) {
      return "text-yellow-500";
    }
    return "text-red-500";
  };

  const confidenceColor = useMemo(() => getConfidenceColor(), [confidence]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full min-h-screen h-full bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
      />
      <div className="absolute top-4 right-4 flex space-x-2">
        {devices.length > 1 && (
          <Button size="icon" onClick={switchCamera} aria-label="Switch Camera">
            <SwitchCamera />
          </Button>
        )}
      </div>
      <div className="absolute bottom-8 bg-white/10 backdrop-blur-2xl p-4 rounded-2xl text-center">
        <p className="text-xl font-bold text-green-500">
          Digit: {prediction ?? "..."}
        </p>
        <p className={`text-sm ${confidenceColor}`}>
          Confidence:{" "}
          {confidence !== null ? (confidence * 100).toFixed(2) + "%" : "..."}
        </p>
      </div>

      <canvas ref={canvasRef} width={28} height={28} className="hidden" />
    </div>
  );
}
