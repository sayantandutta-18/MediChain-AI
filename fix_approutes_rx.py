import re

with open('frontend/src/routes/AppRoutes.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_match = "const AppointmentsPage = lazy(() => import('@/pages/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage })));"
import_replacement = import_match + "\nconst PrescriptionsPage = lazy(() => import('@/pages/PrescriptionsPage').then((m) => ({ default: m.PrescriptionsPage })));"
content = content.replace(import_match, import_replacement)

route_match = """<Route path="/appointments" element={<AppointmentsPage />} />"""
route_replacement = route_match + """\n        <Route path="/prescriptions" element={<PrescriptionsPage />} />"""
content = content.replace(route_match, route_replacement)

with open('frontend/src/routes/AppRoutes.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('frontend/src/components/layout/AppLayout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

nav_match = """  { name: 'Appointments', href: '/appointments', icon: Clock },"""
nav_replacement = """  { name: 'Appointments', href: '/appointments', icon: Clock },
  { name: 'Prescriptions', href: '/prescriptions', icon: Pill },"""
content = content.replace(nav_match, nav_replacement)

icon_match = "import { Activity, BarChart3, Bell, Building2, Clock, Database, FileText, Calendar, LogOut, Menu, ShieldAlert, Sparkles, User, Users, X } from 'lucide-react';"
icon_replacement = "import { Activity, BarChart3, Bell, Building2, Clock, Database, FileText, Calendar, LogOut, Menu, Pill, ShieldAlert, Sparkles, User, Users, X } from 'lucide-react';"
content = content.replace(icon_match, icon_replacement)

with open('frontend/src/components/layout/AppLayout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
