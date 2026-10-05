import re

with open('frontend/src/api/auth.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("login: async (email: string, password: string) => {", "login: async (email: string, password: string, totpCode?: string) => {")
content = content.replace("const { data } = await apiClient.post<Envelope<AuthSession>>('/auth/login', { email, password });", "const { data } = await apiClient.post<Envelope<AuthSession>>('/auth/login', { email, password, totpCode });")

with open('frontend/src/api/auth.ts', 'w', encoding='utf-8') as f:
    f.write(content)

with open('frontend/src/context/AuthContext.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const session = await authApi.login(email, password);", "const session = await authApi.login(email, password, totpCode);")

with open('frontend/src/context/AuthContext.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
