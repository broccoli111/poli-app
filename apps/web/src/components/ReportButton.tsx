'use client';

interface ReportButtonProps {
  context: string;
}

export function ReportButton({ context }: ReportButtonProps) {
  const reportEmail = process.env.NEXT_PUBLIC_REPORT_TO_EMAIL || '';

  if (!reportEmail) return null;

  const subject = encodeURIComponent(`Issue Report: ${context}`);
  const body = encodeURIComponent(`I'd like to report an issue regarding: ${context}\n\nDetails:\n`);

  return (
    <a
      href={`mailto:${reportEmail}?subject=${subject}&body=${body}`}
      className="btn btn-outline btn-sm"
    >
      Report Issue
    </a>
  );
}
