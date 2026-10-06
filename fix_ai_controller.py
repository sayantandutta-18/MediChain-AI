import re

with open('backend/src/controllers/aiController.ts', 'r', encoding='utf-8') as f:
    content = f.read()

with open('compareRecordsController.txt', 'r', encoding='utf-8') as f:
    compare_records = f.read()

content += "\n" + compare_records

with open('backend/src/controllers/aiController.ts', 'w', encoding='utf-8') as f:
    f.write(content)
