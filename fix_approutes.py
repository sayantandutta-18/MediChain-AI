import re

with open('frontend/src/routes/AppRoutes.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_match = "const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));"
import_replacement = import_match + "\nconst HospitalsPage = lazy(() => import('@/pages/HospitalsPage').then((m) => ({ default: m.HospitalsPage })));"
content = content.replace(import_match, import_replacement)

route_match = """<Route path="/timeline" element={<TimelinePage />} />"""
route_replacement = route_match + """\n        <Route path="/hospitals" element={<HospitalsPage />} />"""
content = content.replace(route_match, route_replacement)

with open('frontend/src/routes/AppRoutes.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
