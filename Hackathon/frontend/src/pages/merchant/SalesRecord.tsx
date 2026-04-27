import { useRef, useState } from 'react';

const acceptedFormats = ['CSV', 'XLSX', 'PDF'];

const SalesRecord = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] || null);
  };

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto p-3 xs:p-4 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 overflow-x-hidden">
      <header className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Sales record</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">Upload finance sheets</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Add your sales records here. Localyse will use these files later to power AI recommendations,
            demand patterns, and smarter offer generation.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft text-primary px-3 py-1.5 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          AI-ready data
        </div>
      </header>

      <section className="grid lg:grid-cols-[1fr_360px] gap-5 sm:gap-6">
        <div className="bg-card border border-border rounded-3xl p-4 sm:p-8 shadow-xs">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full min-h-[220px] sm:min-h-[260px] rounded-2xl border-2 border-dashed border-border bg-secondary/30 hover:bg-primary-soft/40 hover:border-primary/40 transition flex flex-col items-center justify-center text-center p-5 sm:p-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-4">
              <i className="bi bi-cloud-arrow-up text-2xl" />
            </div>
            <p className="text-base sm:text-lg font-semibold tracking-tight">
              <span className="break-all">{file ? file.name : 'Upload your finance sheet'}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Drag-and-drop support can be added later. For now, click to select a sales file from your device.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {acceptedFormats.map((format) => (
                <span key={format} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-card border border-border">
                  {format}
                </span>
              ))}
            </div>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.pdf"
            onChange={onFileChange}
            className="hidden"
          />

          {file && (
            <div className="mt-5 bg-background border border-border rounded-2xl p-4 flex flex-wrap items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-lavender-soft text-lavender flex items-center justify-center shrink-0">
                <i className="bi bi-file-earmark-spreadsheet text-lg" />
              </div>
              <div className="w-full min-w-0 xs:flex-1">
                <p className="text-sm font-medium break-all">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB selected
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-xs font-medium text-destructive hover:underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="w-11 h-11 rounded-xl bg-lavender text-lavender-foreground flex items-center justify-center mb-4">
              <i className="bi bi-cpu text-lg" />
            </div>
            <h2 className="text-base font-semibold tracking-tight">How AI will use this</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Uploaded sales records will later help Localyse identify seasonal demand, high-performing items,
              slow periods, and offer opportunities.
            </p>
          </div>

          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xs">
            {[
              { icon: 'bi-shield-check', label: 'Private merchant data', text: 'Only your business account will own this upload.' },
              { icon: 'bi-graph-up-arrow', label: 'Trend detection', text: 'Future AI can compare sales movement over time.' },
              { icon: 'bi-stars', label: 'Offer intelligence', text: 'Sales context will improve generated offers.' },
            ].map((item) => (
              <div key={item.label} className="p-4 sm:p-5 border-b border-border last:border-0 flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
                  <i className={`bi ${item.icon} text-sm`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="bg-card border border-border rounded-3xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning-soft text-warning-fg flex items-center justify-center shrink-0">
            <i className="bi bi-info-circle text-base" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Upload storage coming next</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              This screen is ready for the backend upload endpoint. Once connected, selected finance sheets can be
              stored and linked to the merchant account for AI analysis.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SalesRecord;
