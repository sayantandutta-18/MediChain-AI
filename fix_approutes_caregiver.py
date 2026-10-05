import re

with open('frontend/src/routes/AppRoutes.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_match = "const BlockchainExplorerPage = lazy(() => import('@/pages/BlockchainExplorerPage').then((m) => ({ default: m.BlockchainExplorerPage })));"
import_replacement = import_match + "\nconst CaregiversPage = lazy(() => import('@/pages/CaregiversPage').then((m) => ({ default: m.CaregiversPage })));"
content = content.replace(import_match, import_replacement)

route_match = """<Route path="/explorer" element={<BlockchainExplorerPage />} />"""
route_replacement = route_match + """\n        <Route path="/caregivers" element={<CaregiversPage />} />"""
content = content.replace(route_match, route_replacement)

with open('frontend/src/routes/AppRoutes.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
