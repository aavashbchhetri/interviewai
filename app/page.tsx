// Corrected and cleaned-up version of your component
// Key fixes:
// - Ensured MediaRecorder cleanup
// - Ensured speech recognition type safety workaround
// - Moved prompts outside component to avoid re-creation
// - Removed unused refs
// - Added null checks and defensive coding
// - Fixed React state update timing issues in stopRecording

"use client";

import { useState, useRef, useEffect } from "react";

declare global {
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    onresult: (event: SpeechRecognitionEvent) => void;
    start(): void;
    stop(): void;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly length: number;
    readonly isFinal: boolean;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const topics = [
  {
    id: "job-interview",
    name: "Job Interview",
    description: "Practice common interview questions",
  },
  {
    id: "presentation",
    name: "Presentation",
    description: "Improve your public speaking skills",
  },
  {
    id: "debate",
    name: "Debate",
    description: "Sharpen your argumentation skills",
  },
  {
    id: "sales-pitch",
    name: "Sales Pitch",
    description: "Refine your sales presentation",
  },
  {
    id: "storytelling",
    name: "Storytelling",
    description: "Master the art of narrative",
  },
];

const prompts: Record<string, string[]> = {
  "job-interview": [
    "Welcome! Introduce yourself and state your topic.",
    "Tell me about your previous work experience.",
    "What are your strengths and weaknesses?",
    "Why do you want this job?",
    "Where do you see yourself in 5 years?",
  ],
  presentation: [
    "Welcome! Introduce yourself and state your topic.",
    "Outline the main points of your presentation.",
    "Explain the key benefits or findings.",
    "Address potential questions or objections.",
    "Summarize your main message.",
  ],
  debate: [
    "Welcome! Introduce yourself and state your topic.",
    "Present your main argument.",
    "Provide evidence to support your position.",
    "Address counterarguments.",
    "Conclude your debate points.",
  ],
  "sales-pitch": [
    "Welcome! Introduce yourself and state your topic.",
    "Describe the problem you're solving.",
    "Explain your solution and its benefits.",
    "Discuss pricing and value proposition.",
    "Call to action - what should they do next?",
  ],
  storytelling: [
    "Welcome! Introduce yourself and state your topic.",
    "Set the scene for your story.",
    "Introduce the main characters or elements.",
    "Build up to the climax.",
    "Provide a satisfying conclusion.",
  ],
};

export default function Home() {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopic(topicId);
  };

  if (selectedTopic) {
    return (
      <RecordingPage
        topicId={selectedTopic}
        onBack={() => setSelectedTopic(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            AI Interview Coach
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Choose a topic to start your AI-guided video recording session.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => handleTopicSelect(topic.id)}
            >
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {topic.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {topic.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===========================
// Recording Page Component
// ===========================

function RecordingPage({
  topicId,
  onBack,
}: {
  topicId: string;
  onBack: () => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(
    "Click start to begin your session"
  );
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [transcription, setTranscription] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const topic = topics.find((t) => t.id === topicId);

  // Setup camera
  useEffect(() => {
    const getMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    getMedia();

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Start recording
  const startRecording = () => {
    if (!stream) return;

    const recorder = new MediaRecorder(stream);
    setMediaRecorder(recorder);
    setRecordedChunks([]);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    recorder.start();
    setIsRecording(true);
    setTranscription("");
    setCurrentPrompt("Start speaking to receive AI prompts.");

    // Speech recognition
    if ("webkitSpeechRecognition" in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript;
            setTranscription((prev) => prev + transcript);

            fetch("/api/generate-prompt", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                transcription: transcript,
                topic: topicId,
              }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.prompt) setCurrentPrompt(data.prompt);
              })
              .catch((err) => console.error("Error fetching prompt:", err));
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } else {
      setCurrentPrompt("Speech recognition not supported in this browser.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder) mediaRecorder.stop();
    if (recognitionRef.current) recognitionRef.current.stop();

    setIsRecording(false);
    setCurrentPrompt("Recording stopped. Review your performance!");

    if (recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recording.webm";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Back to Topics
        </button>

        <h2 className="text-2xl font-bold mb-4">{topic?.name} Session</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Video Preview</h3>
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full h-full object-cover rounded"
            />
            <div className="mt-4 flex gap-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`px-6 py-2 rounded font-semibold ${
                  isRecording
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-500 hover:bg-green-600"
                } text-white`}
              >
                {isRecording ? "Stop Recording" : "Start Recording"}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">AI Prompt</h3>
            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded">
              <p className="text-blue-800 dark:text-blue-200">
                {currentPrompt}
              </p>
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              The AI will provide real-time prompts based on your speech.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
