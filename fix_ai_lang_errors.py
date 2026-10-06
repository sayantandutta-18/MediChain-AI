import re

with open('backend/src/services/aiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("context.simpleLanguage ? ', written at a very simple reading level' : ''", "context.language === 'simple-en' ? ', written at a very simple reading level' : ''")
content = content.replace("simpleLanguage: input.language === 'simple-en',", "language: input.language || 'en',")

with open('backend/src/services/aiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
