import re

with open('frontend/src/context/AuthContext.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("login: (email: string, password: string) => Promise<void>;", "login: (email: string, password: string, totpCode?: string) => Promise<void>;")
content = content.replace("const login = useCallback(async (email: string, password: string) => {", "const login = useCallback(async (email: string, password: string, totpCode?: string) => {")
content = content.replace("const { data } = await apiClient.post<Envelope<AuthSession>>('/auth/login', { email, password });", "const { data } = await apiClient.post<Envelope<AuthSession>>('/auth/login', { email, password, totpCode });")

with open('frontend/src/context/AuthContext.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
