import re

with open('frontend/src/pages/AiAssistantPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern_state = r"const \[language, setLanguage\] = useState\<'en' \| 'simple-en'\>\('en'\);"
replacement_state = r"const [language, setLanguage] = useState<'en' | 'simple-en' | 'bn' | 'hi'>('en');"
content = content.replace(pattern_state, replacement_state)

pattern_options = r"const LANGUAGE_OPTIONS = \[\s*\{ value: 'en', label: 'English \(Standard\)' \},\s*\{ value: 'simple-en', label: 'Plain English' \},\s*\]\s*as const;"
replacement_options = r"const LANGUAGE_OPTIONS = [\n  { value: 'en', label: 'English (Standard)' },\n  { value: 'simple-en', label: 'Plain English' },\n  { value: 'bn', label: 'Bengali (?????)' },\n  { value: 'hi', label: 'Hindi (?????)' },\n] as const;"
content = re.sub(pattern_options, replacement_options, content)

pattern_lang = r"recognition\.lang = language === 'simple-en' \? 'en-US' : 'en-US';"
replacement_lang = r"recognition.lang = language === 'bn' ? 'bn-BD' : language === 'hi' ? 'hi-IN' : 'en-US';"
content = content.replace(pattern_lang, replacement_lang)

with open('frontend/src/pages/AiAssistantPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
