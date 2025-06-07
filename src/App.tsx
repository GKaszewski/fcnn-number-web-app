import DigitRecognizer from "./components/digit-recognizer";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <main className="flex min-h-screen w-full">
      <Toaster />
      <DigitRecognizer />
    </main>
  );
}

export default App;
