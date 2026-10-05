import re

with open('frontend/src/routes/AppRoutes.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_match = "const HospitalsPage = lazy(() => import('@/pages/HospitalsPage').then((m) => ({ default: m.HospitalsPage })));"
import_replacement = import_match + "\nconst BlockchainExplorerPage = lazy(() => import('@/pages/BlockchainExplorerPage').then((m) => ({ default: m.BlockchainExplorerPage })));"
content = content.replace(import_match, import_replacement)

route_match = """<Route path="/hospitals" element={<HospitalsPage />} />"""
route_replacement = route_match + """\n        <Route path="/explorer" element={<BlockchainExplorerPage />} />"""
content = content.replace(route_match, route_replacement)

with open('frontend/src/routes/AppRoutes.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
