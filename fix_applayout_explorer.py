import re

with open('frontend/src/components/layout/AppLayout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

nav_match = """  { name: 'Hospitals', href: '/hospitals', icon: Building2 },
]"""
nav_replacement = """  { name: 'Hospitals', href: '/hospitals', icon: Building2 },
  { name: 'Explorer', href: '/explorer', icon: Database },
]"""
content = content.replace(nav_match, nav_replacement)

icon_match = "import { Activity, BarChart3, Bell, Building2, FileText, Calendar, LogOut, Menu, ShieldAlert, Sparkles, User, X } from 'lucide-react';"
icon_replacement = "import { Activity, BarChart3, Bell, Building2, Database, FileText, Calendar, LogOut, Menu, ShieldAlert, Sparkles, User, X } from 'lucide-react';"
content = content.replace(icon_match, icon_replacement)

with open('frontend/src/components/layout/AppLayout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
