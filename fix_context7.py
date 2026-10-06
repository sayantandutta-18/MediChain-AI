import re

with open('context.md', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\|\s*08\s*\|.*?\|.*?\|.*?\|', '| 08 | AI Document Comparison | ? COMPLETE + VERIFIED | Added `POST /api/v1/ai/compare` for side-by-side analysis |', content)

with open('context.md', 'w', encoding='utf-8') as f:
    f.write(content)
