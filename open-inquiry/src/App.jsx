import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are an analytical research assistant operating under a rigorous, multi-source epistemic framework. Your purpose is to explore any topic with intellectual honesty, structured reasoning, and transparent confidence levels.

## FOUNDATIONAL PRINCIPLES

Scientific models are the best current map, not the final territory. Mainstream consensus, government disclosure, and institutional silence do not define the full scope of reality. Operate from established scientific principles while remaining genuinely open to anomalous, emerging, and unconventional evidence.

Asymmetric knowledge distribution is real. Institutional narratives and fringe explanations are both capable of being wrong, partially right, or deliberately misleading. Analyze both without defaulting to either.

## SOURCE HIERARCHY

Draw from all of the following, weighted by reliability criteria:
1. Peer-reviewed journals and established research institutions
2. Technical white papers and industry publications
3. Official statements and press releases (treated as motivated data, not ground truth)
4. Expert communities and practitioner discussions
5. Grassroots investigative groups and independent researchers
6. Eyewitness testimony and firsthand accounts
7. Leaked documents and deep-web material (flagged as unverifiable unless corroborated)

No source tier is automatically authoritative. No source tier is automatically dismissed.

## EVALUATING UNCONVENTIONAL CLAIMS

Apply these criteria to all claims, mainstream or fringe:
- Internal logical consistency
- Physical and scientific plausibility
- Historical precedent (germ theory, prions, H. pylori, continental drift were all once dismissed)
- Incentive and power structure analysis
- Independent corroboration
- Pattern alignment across unrelated sources

## EVIDENCE TIERS — LABEL EVERY CLAIM

Tag every significant claim inline:
VERIFIED — Peer-reviewed, replicated, high confidence
CORROBORATED — Multiple independent sources, not formally proven
CONSENSUS — Strong specialist agreement, may lack full empirical proof
HYPOTHESIS — Logically coherent, physically possible, not yet tested
UNVERIFIED — Single source, leaked, or anecdotal
SPECULATION — Interesting narrative, low evidential support

## INLINE CITATIONS — MANDATORY

Every factual claim must be followed IMMEDIATELY by a citation in this EXACT format:
[Source: Author/Title, Publication/Institution, Year]

Special flags:
- Eyewitness only: [Source: EYEWITNESS - Name/context if public]
- Leaked/unverified: [Source: UNVERIFIED - document name if known]
- Unknown source: [Source: general expert consensus, no primary source identified]

NEVER fabricate citations. If you do not know the exact source, say so inside the tag. Do not batch citations at the end of a response — place them inline immediately after each claim.

## ANALYTICAL APPROACH

- Run multiple hypotheses in parallel, never default to institutional or fringe narrative alone
- Apply incentive analysis to every narrative
- Flag when absence of evidence is used as evidence of absence
- Acknowledge information asymmetry as a real documented phenomenon

## RESPONSE FORMAT

- Open with a brief framing of what is and is not known
- Use tier labels and inline citations throughout
- When sources conflict, show the conflict and cite both sides
- Close every response with: Open Questions — the most important unresolved issues

Analytical rigor and genuine open-mindedness are not opposites. Execute both.`;

const TIER_CONFIG = {
  "VERIFIED": { label: "Verified", color: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.3)" },
  "CORROBORATED": { label: "Corroborated", color: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.3)" },
  "CONSENSUS": { label: "Expert Consensus", color: "#38bdf8", bg: "rgba(56,189,248,0.08)", border: "rgba(56,189,248,0.3)" },
  "HYPOTHESIS": { label: "Hypothesis", color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)" },
  "UNVERIFIED": { label: "Unverified", color: "#fb923c", bg: "rgba(251,146,60,0.08)", border: "rgba(251,146,60,0.3)" },
  "SPECULATION": { label: "Speculation", color: "#c084fc", bg: "rgba(192,132,252,0.08)", border: "rgba(192,132,252,0.3)" },
};

const TIER_EMOJI = {
  "VERIFIED": "✅",
  "CORROBORATED": "📋",
  "CONSENSUS": "🔵",
  "HYPOTHESIS": "💡",
  "UNVERIFIED": "⚠️",
  "SPECULATION": "🌀",
};

const SUGGESTIONS = [
  "What do we actually know about UAP sightings?",
  "Is there scientific evidence for consciousness outside the brain?",
  "What's the real story on placebo effects?",
  "Are there credible reports of ball lightning?",
  "What does science say about near-death experiences?",
];

// Render a text segment, turning [Source: ...] tags into styled chips
function renderWithSources(text, baseKey) {
  const sourceRegex = /\[Source:\s*(.*?)\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let idx = 0;

  while ((match = sourceRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`${baseKey}-t${idx++}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    const sourceText = match[1];
    const isUnverified = sourceText.toUpperCase().includes("UNVERIFIED");
    const isEyewitness = sourceText.toUpperCase().includes("EYEWITNESS");
    const chipColor = isUnverified ? "#fb923c" : isEyewitness ? "#a78bfa" : "#38bdf8";
    const chipBg = isUnverified ? "rgba(251,146,60,0.12)" : isEyewitness ? "rgba(167,139,250,0.12)" : "rgba(56,189,248,0.1)";
    const chipBorder = isUnverified ? "rgba(251,146,60,0.35)" : isEyewitness ? "rgba(167,139,250,0.35)" : "rgba(56,189,248,0.3)";
    const icon = isUnverified ? "⚠️" : isEyewitness ? "👁" : "◦";

    parts.push(
      <span key={`${baseKey}-s${idx++}`} title={sourceText} style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        background: chipBg,
        border: `1px solid ${chipBorder}`,
        borderRadius: "4px",
        padding: "1px 7px 1px 5px",
        fontSize: "0.68rem",
        color: chipColor,
        fontFamily: "monospace",
        marginLeft: "5px",
        verticalAlign: "middle",
        cursor: "default",
        maxWidth: "250px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}>
        <span>{icon}</span>
        <span style={{ opacity: 0.4, margin: "0 2px" }}>·</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{sourceText}</span>
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`${baseKey}-t${idx++}`}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [<span key={`${baseKey}-empty`}>{text}</span>];
}

function renderLine(line, i) {
  // Check for tier labels like "VERIFIED —" or "✅ VERIFIED"
  const tierKeys = Object.keys(TIER_CONFIG);
  let matchedTier = null;
  for (const tier of tierKeys) {
    if (line.match(new RegExp(`^(✅|📋|🔵|💡|⚠️|🌀)?\\s*${tier}`, "i"))) {
      matchedTier = tier;
      break;
    }
  }

  if (matchedTier) {
    const cfg = TIER_CONFIG[matchedTier];
    const emoji = TIER_EMOJI[matchedTier];
    return (
      <div key={i} style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: "6px",
        padding: "0.45rem 0.8rem",
        margin: "0.5rem 0",
        color: cfg.color,
        fontSize: "0.82rem",
        fontFamily: "monospace",
        lineHeight: 1.7,
        display: "flex",
        alignItems: "baseline",
        gap: "6px",
        flexWrap: "wrap",
      }}>
        <span style={{ flexShrink: 0 }}>{emoji} {matchedTier}</span>
        <span style={{ opacity: 0.4 }}>—</span>
        <span style={{ color: "#cbd5e1", fontFamily: "Georgia, serif", fontSize: "0.83rem" }}>
          {renderWithSources(line.replace(new RegExp(`^[✅📋🔵💡⚠️🌀]?\\s*${matchedTier}\\s*[—\\-:]?\\s*`, "i"), ""), i)}
        </span>
      </div>
    );
  }

  // Section headers
  if (/^#{1,3}\s/.test(line) || (/^\*\*[^*]/.test(line) && line.endsWith("**"))) {
    const text = line.replace(/^#+\s/, "").replace(/^\*\*|\*\*$/g, "");
    return (
      <div key={i} style={{
        fontWeight: 700, color: "#64748b",
        marginTop: "0.9rem", marginBottom: "0.2rem",
        fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em",
      }}>{text}</div>
    );
  }

  // Bullet points
  if (/^[-*]\s/.test(line)) {
    return (
      <div key={i} style={{ display: "flex", gap: "0.5rem", paddingLeft: "0.4rem", marginTop: "0.25rem", alignItems: "baseline" }}>
        <span style={{ color: "#334155", flexShrink: 0 }}>•</span>
        <span style={{ color: "#94a3b8" }}>{renderWithSources(line.slice(2), i)}</span>
      </div>
    );
  }

  // Blank
  if (line.trim() === "") return <div key={i} style={{ height: "0.3rem" }} />;

  // Normal
  return <div key={i}>{renderWithSources(line, i)}</div>;
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const lines = msg.content.split("\n");

  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: "1.25rem",
      gap: "0.75rem",
      alignItems: "flex-start",
    }}>
      {!isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
          border: "1px solid #334155",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, flexShrink: 0, marginTop: 3,
        }}>🔭</div>
      )}
      <div style={{
        maxWidth: "80%",
        background: isUser ? "linear-gradient(135deg, #1e3a5f, #0f2847)" : "rgba(15,23,42,0.85)",
        border: isUser ? "1px solid #2563eb44" : "1px solid #1e293b",
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        padding: "0.85rem 1.1rem",
        fontSize: "0.88rem",
        lineHeight: 1.8,
        color: "#cbd5e1",
      }}>
        {lines.map((line, i) => renderLine(line, i))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
      <div style={{
        width: 34, height: 34, borderRadius: "50%",
        background: "linear-gradient(135deg, #1a1a2e, #16213e)",
        border: "1px solid #334155",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
      }}>🔭</div>
      <div style={{ display: "flex", gap: 5, padding: "0.7rem 1rem", background: "rgba(15,23,42,0.8)", border: "1px solid #1e293b", borderRadius: "16px 16px 16px 4px" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%", background: "#475569",
            animation: "pulse 1.2s infinite", animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: newMessages,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const reply = data.content?.[0]?.text || "No response received.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      setError("API error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isEmpty = messages.length === 0;

  return (
    <div style={{ minHeight: "100vh", background: "#020817", fontFamily: "'Georgia', serif", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style>{`
        @keyframes pulse { 0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
        textarea:focus{outline:none}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}
        .sbtn:hover{background:rgba(30,58,138,0.3)!important;border-color:#3b82f6!important;color:#93c5fd!important}
        .send:hover{background:#1d4ed8!important}
        .send:disabled{opacity:.4;cursor:not-allowed}
      `}</style>

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 780, padding: "1.3rem 1.5rem 0.75rem", borderBottom: "1px solid #0a0f1a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: 24 }}>🔭</span>
          <div>
            <div style={{ color: "#e2e8f0", fontSize: "1rem", fontWeight: 700 }}>Open Inquiry</div>
            <div style={{ color: "#334155", fontSize: "0.68rem", fontFamily: "monospace" }}>
              Science-informed · Anomaly-inclusive · Evidence-tiered · Source-cited
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
            {Object.entries(TIER_CONFIG).map(([tier, cfg]) => (
              <div key={tier} title={cfg.label} style={{
                fontSize: 12, width: 24, height: 24, borderRadius: 4,
                background: cfg.bg, border: `1px solid ${cfg.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{TIER_EMOJI[tier]}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ width: "100%", maxWidth: 780, padding: "1.5rem", overflowY: "auto", maxHeight: "calc(100vh - 205px)", overflowX: "hidden" }}>
        {isEmpty && (
          <div style={{ animation: "fadeIn 0.5s ease", textAlign: "center", paddingTop: "2rem" }}>
            <div style={{ fontSize: 44, marginBottom: "0.9rem" }}>🌌</div>
            <div style={{ color: "#334155", fontSize: "0.85rem", maxWidth: 440, margin: "0 auto 2rem", lineHeight: 1.8 }}>
              Ask about anything from classified programs to fringe physics.
              Every claim is evidence-tiered and source-cited inline.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxWidth: 500, margin: "0 auto" }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="sbtn" onClick={() => sendMessage(s)} style={{
                  background: "rgba(15,23,42,0.6)", border: "1px solid #1e293b",
                  borderRadius: 8, padding: "0.55rem 1rem", color: "#475569",
                  fontSize: "0.81rem", cursor: "pointer", textAlign: "left",
                  transition: "all 0.15s ease", fontFamily: "inherit",
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ animation: "fadeIn 0.3s ease" }}>
            <MessageBubble msg={msg} />
          </div>
        ))}

        {loading && <TypingIndicator />}
        {error && (
          <div style={{ color: "#f87171", fontSize: "0.78rem", textAlign: "center", padding: "0.6rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, marginBottom: "1rem" }}>
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Legend */}
      {!isEmpty && (
        <div style={{ width: "100%", maxWidth: 780, padding: "0.4rem 1.5rem", borderTop: "1px solid #0a0f1a", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {Object.entries(TIER_CONFIG).map(([tier, cfg]) => (
            <div key={tier} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.67rem", color: cfg.color, opacity: 0.6 }}>
              <span>{TIER_EMOJI[tier]}</span><span>{cfg.label}</span>
            </div>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, fontSize: "0.67rem", opacity: 0.5 }}>
            <span style={{ color: "#38bdf8" }}>◦ cited</span>
            <span style={{ color: "#a78bfa" }}>👁 eyewitness</span>
            <span style={{ color: "#fb923c" }}>⚠️ unverified</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ width: "100%", maxWidth: 780, padding: "0.6rem 1.5rem 1.3rem" }}>
        <div style={{ display: "flex", gap: "0.65rem", background: "rgba(15,23,42,0.95)", border: "1px solid #1e293b", borderRadius: 11, padding: "0.65rem 0.7rem" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about any anomaly, phenomenon, or contested topic…"
            rows={1}
            style={{ flex: 1, background: "transparent", border: "none", color: "#cbd5e1", fontSize: "0.86rem", resize: "none", fontFamily: "inherit", lineHeight: 1.5 }}
          />
          <button className="send" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{
            background: "#2563eb", border: "none", borderRadius: 7,
            color: "white", padding: "0.42rem 0.9rem", cursor: "pointer",
            fontSize: "0.8rem", transition: "background 0.15s", alignSelf: "flex-end", fontFamily: "inherit",
          }}>Send</button>
        </div>
        <div style={{ color: "#0f172a", fontSize: "0.65rem", textAlign: "center", marginTop: "0.3rem" }}>Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  );
}
