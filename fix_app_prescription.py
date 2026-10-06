import re

with open('backend/src/app.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import appointmentRoutes from './routes/appointmentRoutes';", "import appointmentRoutes from './routes/appointmentRoutes';\nimport prescriptionRoutes from './routes/prescriptionRoutes';")
content = content.replace("app.use('/api/v1/appointments', appointmentRoutes);", "app.use('/api/v1/appointments', appointmentRoutes);\napp.use('/api/v1/prescriptions', prescriptionRoutes);")

with open('backend/src/app.ts', 'w', encoding='utf-8') as f:
    f.write(content)
