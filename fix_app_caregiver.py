import re

with open('backend/src/app.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import blockchainRoutes from './routes/blockchainRoutes';", "import blockchainRoutes from './routes/blockchainRoutes';\nimport caregiverRoutes from './routes/caregiverRoutes';")
content = content.replace("app.use('/api/v1/blockchain', blockchainRoutes);", "app.use('/api/v1/blockchain', blockchainRoutes);\napp.use('/api/v1/caregivers', caregiverRoutes);")

with open('backend/src/app.ts', 'w', encoding='utf-8') as f:
    f.write(content)
