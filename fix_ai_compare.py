import re

with open('backend/src/services/aiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

with open('compareRecords.txt', 'r', encoding='utf-8') as f:
    compare_records = f.read()

content += "\n" + compare_records

with open('backend/src/services/aiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
