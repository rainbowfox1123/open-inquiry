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
  VERIFIED:     { label: "Verified",     color: "#16a34a", darkColor: "#4ade80" },
  CORROBORATED: { label: "Corroborated", color: "#2563eb", darkColor: "#60a5fa" },
  CONSENSUS:    { label: "Consensus",    color: "#0284c7", darkColor: "#38bdf8" },
  HYPOTHESIS:   { label: "Hypothesis",   color: "#d97706", darkColor: "#fbbf24" },
  UNVERIFIED:   { label: "Unverified",   color: "#ea580c", darkColor: "#fb923c" },
  SPECULATION:  { label: "Speculation",  color: "#9333ea", darkColor: "#c084fc" },
};

const TIER_EMOJI = {
  VERIFIED: "✅", CORROBORATED: "📋", CONSENSUS: "🔵",
  HYPOTHESIS: "💡", UNVERIFIED: "⚠️", SPECULATION: "🌀",
};

const SUGGESTIONS = [
  "What do we actually know about UAP sightings?",
  "Is there evidence for consciousness outside the brain?",
  "What's the real story on placebo effects?",
  "Are there credible reports of ball lightning?",
  "What does science say about near-death experiences?",
];

// Theme tokens — dark and light
function getTheme(dark) {
  return dark ? {
    bg:          "#080c14",
    bgSecondary: "#0f172a",
    bgTertiary:  "#1e293b",
    border:      "#1e293b",
    borderFaint: "#0f172a",
    text:        "#e2e8f0",
    textMuted:   "#94a3b8",
    textFaint:   "#475569",
    textVeryFaint: "#334155",
    userBubbleBg: "#0f172a",
    userBubbleBorder: "#1e293b",
    inputBg:     "#0f172a",
    inputBorder: "#1e293b",
    inputText:   "#cbd5e1",
    placeholder: "#334155",
    sendBg:      "#2563eb",
    errorBg:     "rgba(239,68,68,0.06)",
    errorBorder: "rgba(239,68,68,0.15)",
    errorText:   "#f87171",
    avatarBg:    "#0f172a",
    avatarBorder:"#1e293b",
    sbtnBorder:  "#1e293b",
    sbtnText:    "#475569",
    sbtnActiveBg:"#0f172a",
    sbtnActiveText:"#60a5fa",
  } : {
    bg:          "#ffffff",
    bgSecondary: "#f8fafc",
    bgTertiary:  "#f1f5f9",
    border:      "#e2e8f0",
    borderFaint: "#f1f5f9",
    text:        "#0f172a",
    textMuted:   "#475569",
    textFaint:   "#94a3b8",
    textVeryFaint:"#cbd5e1",
    userBubbleBg: "#f1f5f9",
    userBubbleBorder: "#e2e8f0",
    inputBg:     "#f8fafc",
    inputBorder: "#e2e8f0",
    inputText:   "#0f172a",
    placeholder: "#94a3b8",
    sendBg:      "#2563eb",
    errorBg:     "rgba(239,68,68,0.05)",
    errorBorder: "rgba(239,68,68,0.2)",
    errorText:   "#dc2626",
    avatarBg:    "#f1f5f9",
    avatarBorder:"#e2e8f0",
    sbtnBorder:  "#e2e8f0",
    sbtnText:    "#64748b",
    sbtnActiveBg:"#eff6ff",
    sbtnActiveText:"#2563eb",
  };
}

function renderWithSources(text, baseKey, t) {
  const sourceRegex = /\[Source:\s*(.*?)\]/g;
  const parts = [];
  let lastIndex = 0, match, idx = 0;

  while ((match = sourceRegex.exec(text)) !== null) {
    if (match.index > lastIndex)
      parts.push(<span key={`${baseKey}-t${idx++}`}>{text.slice(lastIndex, match.index)}</span>);

    const src = match[1];
    const isUnverified = src.toUpperCase().includes("UNVERIFIED");
    const isEyewitness = src.toUpperCase().includes("EYEWITNESS");
    const c = isUnverified ? "#ea580c" : isEyewitness ? "#9333ea" : t.textFaint;
    const icon = isUnverified ? "⚠" : isEyewitness ? "👁" : "·";

    parts.push(
      <span key={`${baseKey}-s${idx++}`} title={src} style={{
        display: "inline-flex", alignItems: "center", gap: 2,
        border: `1px solid ${c}44`,
        borderRadius: 3,
        padding: "0 5px",
        fontSize: "0.63rem",
        color: c,
        fontFamily: "monospace",
        marginLeft: 4,
        verticalAlign: "middle",
        maxWidth: 180,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}>
        <span>{icon}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", marginLeft: 2 }}>{src}</span>
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length)
    parts.push(<span key={`${baseKey}-t${idx++}`}>{text.slice(lastIndex)}</span>);

  return parts.length > 0 ? parts : [<span key={`${baseKey}-0`}>{text}</span>];
}

function renderLine(line, i, dark, t) {
  for (const tier of Object.keys(TIER_CONFIG)) {
    if (line.match(new RegExp(`^[✅📋🔵💡⚠️🌀]?\\s*${tier}`, "i"))) {
      const cfg = TIER_CONFIG[tier];
      const color = dark ? cfg.darkColor : cfg.color;
      const body = line.replace(new RegExp(`^[✅📋🔵💡⚠️🌀]?\\s*${tier}\\s*[—\\-:]?\\s*`, "i"), "");
      return (
        <div key={i} style={{
          background: `${color}0f`,
          borderLeft: `2px solid ${color}`,
          borderRadius: "0 4px 4px 0",
          padding: "6px 10px",
          margin: "6px 0",
          fontSize: "0.8rem",
          lineHeight: 1.6,
        }}>
          <span style={{ color, fontFamily: "monospace", fontSize: "0.68rem", fontWeight: 600, marginRight: 6 }}>
            {TIER_EMOJI[tier]} {tier}
          </span>
          <span style={{ color: t.textMuted }}>{renderWithSources(body, i, t)}</span>
        </div>
      );
    }
  }

  if (/^#{1,3}\s/.test(line) || (/^\*\*[^*]/.test(line) && line.endsWith("**"))) {
    const text = line.replace(/^#+\s/, "").replace(/^\*\*|\*\*$/g, "");
    return <div key={i} style={{ color: t.textFaint, fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginTop: "1rem", marginBottom: "0.15rem" }}>{text}</div>;
  }

  if (/^[-*]\s/.test(line)) {
    return (
      <div key={i} style={{ display: "flex", gap: 6, paddingLeft: 4, marginTop: 3, color: t.textMuted, fontSize: "0.84rem" }}>
        <span style={{ color: t.textVeryFaint, flexShrink: 0 }}>·</span>
        <span>{renderWithSources(line.slice(2), i, t)}</span>
      </div>
    );
  }

  if (line.trim() === "") return <div key={i} style={{ height: "0.25rem" }} />;
  return <div key={i} style={{ color: t.textMuted, fontSize: "0.84rem", lineHeight: 1.75 }}>{renderWithSources(line, i, t)}</div>;
}

function MessageBubble({ msg, dark, t }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: "1rem",
      gap: 8,
      alignItems: "flex-start",
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: t.avatarBg,
          border: `1px solid ${t.avatarBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, flexShrink: 0, marginTop: 2,
        }}>🛸</div>
      )}
      <div style={{
        maxWidth: isUser ? "75%" : "90%",
        background: isUser ? t.userBubbleBg : "transparent",
        border: isUser ? `1px solid ${t.userBubbleBorder}` : "none",
        borderRadius: isUser ? "14px 14px 4px 14px" : 0,
        padding: isUser ? "0.6rem 0.9rem" : "0 0.1rem",
        fontSize: "0.84rem",
        lineHeight: 1.75,
        color: isUser ? t.textMuted : t.textMuted,
      }}>
        {isUser
          ? <span style={{ color: t.text }}>{msg.content}</span>
          : msg.content.split("\n").map((line, i) => renderLine(line, i, dark, t))
        }
      </div>
    </div>
  );
}

function TypingIndicator({ t }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: "1rem", paddingLeft: 36 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 4, height: 4, borderRadius: "50%",
          background: t.textVeryFaint,
          animation: "pulse 1.2s infinite",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dark, setDark] = useState(() =>
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true
  );

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const t = getTheme(dark);

  // Listen for OS theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

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
      setMessages([...newMessages, { role: "assistant", content: data.content?.[0]?.text || "No response." }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isEmpty = messages.length === 0;

  return (
    <div style={{
      height: "100dvh",
      background: t.bg,
      fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
      display: "flex",
      flexDirection: "column",
      maxWidth: 680,
      margin: "0 auto",
      transition: "background 0.2s, color 0.2s",
    }}>
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: ${t.bg}; transition: background 0.2s; }
        @keyframes pulse { 0%,80%,100%{opacity:.2}40%{opacity:.7} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)} }
        textarea { -webkit-appearance: none; }
        textarea:focus { outline: none; }
        ::-webkit-scrollbar { width: 0; }
        .send:disabled { opacity: .3; }
      `}</style>

      {/* Header */}
      <div style={{
        paddingTop: "max(env(safe-area-inset-top), 14px)",
        padding: "14px 16px 12px",
        paddingTop: "max(env(safe-area-inset-top), 14px)",
        borderBottom: `1px solid ${t.border}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
        background: t.bg,
      }}>
        <span style={{ fontSize: 20 }}>🛸</span>
        <div>
          <div style={{ color: t.text, fontSize: "0.95rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
            Open Inquiry
          </div>
          <div style={{ color: t.textVeryFaint, fontSize: "0.6rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Evidence-tiered · Source-cited
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {/* Tier icons */}
          <div style={{ display: "flex", gap: 3 }}>
            {Object.entries(TIER_EMOJI).map(([tier, emoji]) => (
              <span key={tier} title={TIER_CONFIG[tier].label} style={{ fontSize: 11, opacity: 0.4 }}>{emoji}</span>
            ))}
          </div>
          {/* Light/dark toggle */}
          <button
            onClick={() => setDark(d => !d)}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: t.bgTertiary,
              border: `1px solid ${t.border}`,
              borderRadius: 20,
              padding: "3px 8px",
              cursor: "pointer",
              fontSize: "0.7rem",
              color: t.textFaint,
              fontFamily: "inherit",
              marginLeft: 4,
            }}
          >{dark ? "☀️" : "🌙"}</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 14px 8px",
        WebkitOverflowScrolling: "touch",
        background: t.bg,
      }}>
        {isEmpty && (
          <div style={{ animation: "fadeUp 0.4s ease", paddingTop: "1.5rem" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ fontSize: 38, marginBottom: 8 }}>🛸</div>
              <div style={{ color: t.textFaint, fontSize: "0.8rem", lineHeight: 1.75, maxWidth: 280, margin: "0 auto" }}>
                Ask about anything from UAPs to consciousness research. Every claim is tiered and source-cited.
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)} style={{
                  background: "transparent",
                  border: `1px solid ${t.sbtnBorder}`,
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: t.sbtnText,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  lineHeight: 1.4,
                  transition: "all 0.1s",
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ animation: "fadeUp 0.25s ease" }}>
            <MessageBubble msg={msg} dark={dark} t={t} />
          </div>
        ))}

        {loading && <TypingIndicator t={t} />}

        {error && (
          <div style={{
            color: t.errorText, fontSize: "0.75rem",
            padding: "8px 12px",
            background: t.errorBg,
            border: `1px solid ${t.errorBorder}`,
            borderRadius: 6, marginBottom: 8,
          }}>{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Legend */}
      {!isEmpty && (
        <div style={{
          padding: "4px 14px 5px",
          display: "flex", gap: 10, flexWrap: "wrap",
          borderTop: `1px solid ${t.borderFaint}`,
          background: t.bg,
        }}>
          {Object.entries(TIER_CONFIG).map(([tier, cfg]) => {
            const color = dark ? cfg.darkColor : cfg.color;
            return (
              <span key={tier} style={{ fontSize: "0.58rem", color, opacity: 0.6, display: "flex", alignItems: "center", gap: 2 }}>
                {TIER_EMOJI[tier]} {cfg.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: "8px 14px",
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
        borderTop: `1px solid ${t.border}`,
        flexShrink: 0,
        background: t.bg,
      }}>
        <div style={{
          display: "flex",
          gap: 8,
          background: t.inputBg,
          border: `1px solid ${t.inputBorder}`,
          borderRadius: 12,
          padding: "8px 8px 8px 14px",
          alignItems: "flex-end",
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything…"
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: t.inputText,
              fontSize: "0.9rem",
              resize: "none",
              fontFamily: "inherit",
              lineHeight: 1.5,
              maxHeight: 120,
              overflowY: "auto",
            }}
          />
          <button
            className="send"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              background: t.sendBg,
              border: "none",
              borderRadius: 8,
              color: "white",
              width: 34, height: 34,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              fontSize: "1rem",
              transition: "background 0.1s, opacity 0.1s",
            }}
          >↑</button>
        </div>
      </div>
    </div>
  );
}
