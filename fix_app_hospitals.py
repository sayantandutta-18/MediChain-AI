import re

with open('backend/src/app.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import securityRoutes from './routes/securityRoutes';", "import securityRoutes from './routes/securityRoutes';\nimport hospitalRoutes from './routes/hospitalRoutes';")
content = content.replace("app.use('/api/v1/security', securityRoutes);", "app.use('/api/v1/security', securityRoutes);\napp.use('/api/v1/hospitals', hospitalRoutes);")

with open('backend/src/app.ts', 'w', encoding='utf-8') as f:
    f.write(content)
