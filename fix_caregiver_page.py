import re

with open('frontend/src/pages/CaregiversPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const { user } = useAuth();", "")

with open('frontend/src/pages/CaregiversPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
