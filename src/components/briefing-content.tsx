function parseBriefingSections(content: string) {
  const whyMatch = content.match(/WHY this matters:\n([\s\S]*?)(?=\n\nHOW to respond:|$)/);
  const howMatch = content.match(/HOW to respond:\n([\s\S]*?)(?=\n\nWHAT they need:|$)/);
  const whatMatch = content.match(/WHAT they need:\n([\s\S]*?)$/);

  if (whyMatch && howMatch && whatMatch) {
    return {
      why: whyMatch[1].trim(),
      how: howMatch[1].trim(),
      what: whatMatch[1].trim(),
    };
  }

  return null;
}

function BriefingContent({ content }: { content: string }) {
  const sections = parseBriefingSections(content);

  if (!sections) {
    return <p className="leading-relaxed whitespace-pre-wrap">{content}</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Why</p>
        <p className="leading-relaxed text-sm">{sections.why}</p>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">How to respond</p>
        <p className="leading-relaxed text-sm">{sections.how}</p>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">What they need</p>
        <p className="leading-relaxed text-sm">{sections.what}</p>
      </div>
    </div>
  );
}

export { BriefingContent, parseBriefingSections };
