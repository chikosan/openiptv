"use client";

import { useState } from "react";
import { Plus, Trash2, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { epgManager } from "@/lib/epg/epg-manager";
import { useEPGStore } from "@/lib/store/epg-store";

export function EPGSettings() {
  const { sources, addSource, removeSource } = useEPGStore();
  const [newUrl, setNewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleAdd = async () => {
    const url = newUrl.trim();
    if (!url) {
      setStatus("error");
      setMessage("Please enter an EPG URL");
      return;
    }
    if (sources.includes(url)) {
      setStatus("error");
      setMessage("This source is already configured");
      return;
    }

    setLoading(true);
    setStatus("idle");

    try {
      const nextSources = [...sources, url];
      epgManager.setEPGSources(nextSources);
      await epgManager.loadEPG([]);
      addSource(url);
      setNewUrl("");
      setStatus("success");
      setMessage("EPG source added and loaded successfully!");
    } catch (error) {
      console.error("EPG configuration error:", error);
      // Roll back the manager to the persisted list
      epgManager.setEPGSources(sources);
      setStatus("error");
      setMessage("Failed to load EPG: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (url: string) => {
    removeSource(url);
    const next = sources.filter((s) => s !== url);
    epgManager.setEPGSources(next);
    epgManager.loadEPG([]);
    setStatus("success");
    setMessage("EPG source removed.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">EPG (Program Guide) Settings</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure one or more XMLTV sources — they are merged into a single guide
        </p>

        {/* Configured sources */}
        {sources.length > 0 && (
          <div className="space-y-2 mb-4">
            {sources.map((url) => (
              <div key={url} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                <span className="flex-1 min-w-0 text-sm truncate" title={url}>
                  {url}
                </span>
                <button
                  onClick={() => handleRemove(url)}
                  className="p-2 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded hover:bg-destructive/20 text-destructive flex-shrink-0"
                  title="Remove source"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add source */}
        <div className="space-y-3">
          <div>
            <label htmlFor="epg-url" className="text-sm font-medium mb-2 block">
              Add XMLTV EPG URL
            </label>
            <input
              id="epg-url"
              name="epg-url"
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="https://example.com/epg.xml"
              className="w-full px-3 py-2 border rounded-md bg-background text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add & Load Source
              </>
            )}
          </button>

          {/* Status Message */}
          {status !== "idle" && (
            <div
              className={`flex items-start gap-2 p-3 rounded-md ${
                status === "success" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              }`}
            >
              {status === "success" ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
              )}
              <p className="text-sm">{message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Example Sources */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">📺 EPG Sources</h4>
        <p className="text-sm text-muted-foreground mb-3">You need an XMLTV EPG file URL. Here are some options:</p>

        <div className="space-y-2 text-sm">
          <div className="p-2 bg-background rounded border">
            <p className="font-medium">Option 1: IPTV-Org EPG (Free)</p>
            <p className="text-xs text-muted-foreground mt-1">
              Check: <code className="text-xs">https://github.com/iptv-org/epg</code>
            </p>
            <p className="text-xs text-muted-foreground">
              Example: <code className="text-xs">https://iptv-org.github.io/epg/guides/il.xml</code> (Israel)
            </p>
          </div>

          <div className="p-2 bg-background rounded border">
            <p className="font-medium">Option 2: Your IPTV Provider</p>
            <p className="text-xs text-muted-foreground mt-1">Many IPTV services provide EPG URLs</p>
          </div>

          <div className="p-2 bg-background rounded border">
            <p className="font-medium">Option 3: Custom XMLTV File</p>
            <p className="text-xs text-muted-foreground mt-1">Host your own XMLTV file and provide the URL</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          ℹ️ <strong>Note:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>EPG data must be in XMLTV format</li>
          <li>The URL must be publicly accessible (CORS enabled)</li>
          <li>Multiple sources are merged; large files may take time to load</li>
          <li>Parsed data is cached locally for 6 hours</li>
        </ul>
      </div>
    </div>
  );
}
