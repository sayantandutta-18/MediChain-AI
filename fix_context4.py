import re

with open('context.md', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\|\s*15\s*\|.*?\|.*?\|.*?\|', '| 15 | Appointments | ? COMPLETE + VERIFIED | Added Appointments model, API, and UI |', content)
content = re.sub(r'\|\s*16\s*\|.*?\|.*?\|.*?\|', '| 16 | Medication Tracker | ? COMPLETE + VERIFIED | Added Prescription model, active tracker, and UI |', content)
content = re.sub(r'\|\s*17\s*\|.*?\|.*?\|.*?\|', '| 17 | Prescription Management | ? COMPLETE + VERIFIED | Included alongside Medication Tracker |', content)

with open('context.md', 'w', encoding='utf-8') as f:
    f.write(content)
