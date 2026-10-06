import re

with open('backend/src/app.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import caregiverRoutes from './routes/caregiverRoutes';", "import caregiverRoutes from './routes/caregiverRoutes';\nimport appointmentRoutes from './routes/appointmentRoutes';")
content = content.replace("app.use('/api/v1/caregivers', caregiverRoutes);", "app.use('/api/v1/caregivers', caregiverRoutes);\napp.use('/api/v1/appointments', appointmentRoutes);")

with open('backend/src/app.ts', 'w', encoding='utf-8') as f:
    f.write(content)
