import re

with open('context.md', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\|\s*25\s*\|.*?\|.*?\|.*?\|', '| 25 | Ecosystem Dashboard | ? COMPLETE + VERIFIED | Added ecosystem module links to the main Dashboard |', content)

with open('context.md', 'w', encoding='utf-8') as f:
    f.write(content)
