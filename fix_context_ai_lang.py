import re

with open('context.md', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\|\s*20\s*\|.*?\|.*?\|.*?\|', '| 20 | Multi-language AI | ? COMPLETE + VERIFIED | Added Bengali and Hindi support in AI Assistant |', content)

with open('context.md', 'w', encoding='utf-8') as f:
    f.write(content)
