import React, { useState } from 'react';
import { Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function DeployManager() {
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const triggerDeploy = async () => {
    // These should ideally be stored in the database or an environment variable,
    // but for security, requesting it when needed or using a proxy is best.
    const owner = window.prompt("Enter GitHub Repository Owner (e.g., your-username):");
    if (!owner) return;
    
    const repo = window.prompt("Enter GitHub Repository Name (e.g., kcet-ranks):");
    if (!repo) return;

    const token = window.prompt("Enter your GitHub Personal Access Token (PAT) with repo scopes:");
    if (!token) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/deploy-r2.yml/dispatches`, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: 'main' // Branch to run the workflow on
        })
      });

      if (response.ok) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${response.status}`);
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Failed to trigger deploy.');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Static Site Generation (SSG) & Deployment</h2>
      <p className="text-gray-600 mb-6 text-sm">
        Trigger a manual GitHub Actions build to regenerate the entire static site (including all 100k+ cutoff articles) and deploy to Cloudflare Pages.
      </p>

      <div className="flex items-center gap-4">
        <button
          onClick={triggerDeploy}
          disabled={status === 'loading'}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          Trigger SSG Build & Deploy
        </button>

        {status === 'success' && (
          <span className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4" /> Workflow triggered successfully!
          </span>
        )}

        {status === 'error' && (
          <span className="flex items-center gap-2 text-red-600 font-semibold text-sm">
            <AlertCircle className="w-4 h-4" /> {errorMsg}
          </span>
        )}
      </div>
    </div>
  );
}
