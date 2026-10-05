import re

with open('frontend/src/pages/SecurityCenterPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
content = content.replace(
    "import { useEffect, useState } from 'react';",
    "import { useEffect, useState } from 'react';\nimport { authApi } from '@/api/auth';\nimport { useAuth } from '@/context/AuthContext';"
)

# Add state
state_match = "const [isLoading, setIsLoading] = useState(true);"
state_replacement = """const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const [mfaSetup, setMfaSetup] = useState<{ qrCodeUrl: string, secret: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  
  const handleSetupMfa = async () => {
    try {
      const data = await authApi.setupMfa();
      setMfaSetup(data);
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleVerifyMfa = async () => {
    try {
      setMfaError(null);
      await authApi.verifyMfa(mfaCode);
      window.location.reload();
    } catch (err: any) {
      setMfaError(err.response?.data?.error || 'Invalid code');
    }
  };"""
content = content.replace(state_match, state_replacement)

# Add UI
ui_match = """      <div className="space-y-4">"""
ui_replacement = """      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Two-Factor Authentication (2FA)</h2>
        {user?.isTwoFactorEnabled ? (
          <div className="flex items-center text-emerald-400 bg-emerald-500/10 px-4 py-3 rounded-lg">
            <ShieldCheck className="h-5 w-5 mr-2" />
            <span>Two-factor authentication is active on your account.</span>
          </div>
        ) : mfaSetup ? (
          <div className="space-y-4">
            <p className="text-slate-300">Scan this QR code with your authenticator app:</p>
            <img src={mfaSetup.qrCodeUrl} alt="QR Code" className="w-48 h-48 rounded bg-white p-2" />
            <div className="flex gap-2 max-w-xs">
              <input type="text" placeholder="Enter 6-digit code" className="field" value={mfaCode} onChange={e => setMfaCode(e.target.value)} />
              <button onClick={handleVerifyMfa} className="btn-primary">Verify</button>
            </div>
            {mfaError && <p className="text-rose-400 text-sm">{mfaError}</p>}
          </div>
        ) : (
          <button onClick={handleSetupMfa} className="btn-primary">Enable 2FA</button>
        )}
      </div>

      <div className="space-y-4">"""
content = content.replace(ui_match, ui_replacement)

with open('frontend/src/pages/SecurityCenterPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
