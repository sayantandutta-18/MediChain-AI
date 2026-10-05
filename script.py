import re

with open('frontend/src/pages/AiAssistantPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
content = content.replace(
    "import { BookOpen, HelpCircle, Sparkles } from 'lucide-react';",
    "import { BookOpen, HelpCircle, Sparkles, Mic, MicOff } from 'lucide-react';"
)

# Add state
state_match = "const [isConfigured, setIsConfigured] = useState<boolean | null>(null);"
state_replacement = """const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isListening, setIsListening] = useState(false);

  const handleListen = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === 'simple-en' ? 'en-US' : 'en-US';
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuestion(prev => (prev ? prev + ' ' : '') + transcript);
    };
    
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };"""
content = content.replace(state_match, state_replacement)

# Replace input with mic
input_match = """                <input
                  id="ai-question"
                  type="text"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="e.g. What should I ask about these results?"
                  className="field"
                  maxLength={500}
                />"""
input_replacement = """                <div className="relative flex items-center">
                  <input
                    id="ai-question"
                    type="text"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="e.g. What should I ask about these results?"
                    className="field pr-12"
                    maxLength={500}
                  />
                  <button 
                    type="button"
                    onClick={handleListen}
                    className={bsolute right-2 p-1.5 rounded-full transition-colors }
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                </div>"""
content = content.replace(input_match, input_replacement)

with open('frontend/src/pages/AiAssistantPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
