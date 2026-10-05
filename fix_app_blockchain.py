import re

with open('backend/src/app.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import hospitalRoutes from './routes/hospitalRoutes';", "import hospitalRoutes from './routes/hospitalRoutes';\nimport blockchainRoutes from './routes/blockchainRoutes';")
content = content.replace("app.use('/api/v1/hospitals', hospitalRoutes);", "app.use('/api/v1/hospitals', hospitalRoutes);\napp.use('/api/v1/blockchain', blockchainRoutes);")

with open('backend/src/app.ts', 'w', encoding='utf-8') as f:
    f.write(content)
