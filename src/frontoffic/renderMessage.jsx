export function useRenderMessage() {
  return function renderMsg(text) {
    if (!text) return null;
    const downloadRegex = /\[DOWNLOAD:([^|\]]+)\|([^\]]+)\]/g;
    let parts = [];
    let lastIndex = 0;
    let match;
    while ((match = downloadRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const url = match[1];
      const label = match[2];
      parts.push(
        <button
          key={url + label}
          onClick={() => window.open(url, "_blank")}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            color: '#a31919',
            border: 'none',
            cursor: 'pointer',
            margin: '8px 0',
            padding: 0,
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'underline'
          }}
        >
          Voir le document
        </button>
      );
      lastIndex = downloadRegex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return <>{parts}</>;
  };
}
