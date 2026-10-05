import re

with open('frontend/src/pages/AiAssistantPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<input\s+id="ai-question".*?maxLength=\{500\}\s*/>'
replacement = """<div className="relative flex items-center">
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

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('frontend/src/pages/AiAssistantPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
