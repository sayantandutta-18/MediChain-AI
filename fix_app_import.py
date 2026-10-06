import re

with open('backend/src/app.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import prescriptionRoutes from './routes/prescriptionRoutes';", "import prescriptionRoutes from './routes/prescriptionRoutes';\nimport importRoutes from './routes/importRoutes';")
content = content.replace("app.use('/api/v1/prescriptions', prescriptionRoutes);", "app.use('/api/v1/prescriptions', prescriptionRoutes);\napp.use('/api/v1/import', importRoutes);")

with open('backend/src/app.ts', 'w', encoding='utf-8') as f:
    f.write(content)
