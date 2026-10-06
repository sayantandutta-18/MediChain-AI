import re

with open('backend/src/services/aiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern_interface = r'simpleLanguage: boolean;'
replacement_interface = r'language: string;'
content = content.replace(pattern_interface, replacement_interface)

pattern_prompt = r'Return JSON with exactly these keys:\n  \{\n    "summary": string.*?urgency": "routine" \| "discuss-soon" \| "prompt-attention"\n  \}`;'
replacement_prompt = r'''Language: ${context.language}

  Return JSON with exactly these keys:
  {
    "summary": string (2-3 sentences describing what this document is and its purpose, in the specified Language),
    "keyFindings": string[] (3-6 bullet findings drawn from the document, in the specified Language),
    "terminology": Array<{ "term": string, "explanation": string }> (0-6 medical terms explained simply, in the specified Language),
    "patientFriendlyExplanation": string (plain language paragraph, no jargon, in the specified Language),
    "suggestedQuestions": string[] (3-5 questions the patient could ask their doctor, in the specified Language),
    "urgency": "routine" | "discuss-soon" | "prompt-attention"
  }`;'''
content = re.sub(pattern_prompt, replacement_prompt, content, flags=re.DOTALL)

pattern_call = r"simpleLanguage: input\.language === 'simple-en',"
replacement_call = r"language: input.language || 'English',"
content = content.replace(pattern_call, replacement_call)

with open('backend/src/services/aiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
