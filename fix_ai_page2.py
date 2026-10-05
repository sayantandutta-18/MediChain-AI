import re

with open('frontend/src/pages/AiAssistantPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace imports carefully
content = content.replace(
    "import { BookOpen, HelpCircle, Sparkles } from 'lucide-react';",
    "import { BookOpen, HelpCircle, Sparkles, Mic, MicOff } from 'lucide-react';"
)

# Insert the handleListen logic
state_anchor = "const [isConfigured, setIsConfigured] = useState<boolean | null>(null);"
if state_anchor in content and "const handleListen =" not in content:
    replacement_state = """const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
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
    content = content.replace(state_anchor, replacement_state)

# Replace the specific input safely
input_pattern = re.compile(
    r'<input\s+id="ai-question"\s+type="text"\s+value=\{question\}\s+onChange=\{\(event\) => setQuestion\(event\.target\.value\)\}\s+placeholder="e\.g\. What should I ask about these results\?"\s+className="field"\s+maxLength=\{500\}\s*/>'
)
if input_pattern.search(content):
    replacement_input = """<div className="relative flex items-center">
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
                  className={`absolute right-2 p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              </div>"""
    content = input_pattern.sub(replacement_input, content)

with open('frontend/src/pages/AiAssistantPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
