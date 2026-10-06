import re

with open('backend/src/controllers/aiController.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { aiHealth, analyzeRecord, generateTimelineNarrative } from '../services/aiService';", "import { aiHealth, analyzeRecord, generateTimelineNarrative, compareRecords as compareRecordsService } from '../services/aiService';")
content = content.replace("await aiService.compareRecords(user, recordIds, language);", "await compareRecordsService(user, recordIds, language);")

with open('backend/src/controllers/aiController.ts', 'w', encoding='utf-8') as f:
    f.write(content)
