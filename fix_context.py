import re

with open('context.md', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\|\s*09\s*\|\s*Blockchain Explorer.*', '| 09 | Blockchain Explorer | ? COMPLETE + VERIFIED | Added frontend BlockchainExplorerPage and backend endpoints |', content)

with open('context.md', 'w', encoding='utf-8') as f:
    f.write(content)
