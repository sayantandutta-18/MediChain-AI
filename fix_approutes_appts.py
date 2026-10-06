import re

with open('frontend/src/routes/AppRoutes.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_match = "const CaregiversPage = lazy(() => import('@/pages/CaregiversPage').then((m) => ({ default: m.CaregiversPage })));"
import_replacement = import_match + "\nconst AppointmentsPage = lazy(() => import('@/pages/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage })));"
content = content.replace(import_match, import_replacement)

route_match = """<Route path="/caregivers" element={<CaregiversPage />} />"""
route_replacement = route_match + """\n        <Route path="/appointments" element={<AppointmentsPage />} />"""
content = content.replace(route_match, route_replacement)

with open('frontend/src/routes/AppRoutes.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('frontend/src/components/layout/AppLayout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

nav_match = """  { name: 'Caregivers', href: '/caregivers', icon: Users },"""
nav_replacement = """  { name: 'Caregivers', href: '/caregivers', icon: Users },
  { name: 'Appointments', href: '/appointments', icon: Clock },"""
content = content.replace(nav_match, nav_replacement)

icon_match = "import { Activity, BarChart3, Bell, Building2, Database, FileText, Calendar, LogOut, Menu, ShieldAlert, Sparkles, User, Users, X } from 'lucide-react';"
icon_replacement = "import { Activity, BarChart3, Bell, Building2, Clock, Database, FileText, Calendar, LogOut, Menu, ShieldAlert, Sparkles, User, Users, X } from 'lucide-react';"
content = content.replace(icon_match, icon_replacement)

with open('frontend/src/components/layout/AppLayout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
