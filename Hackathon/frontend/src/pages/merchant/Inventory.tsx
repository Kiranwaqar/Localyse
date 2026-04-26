import { useMemo, useRef, useState } from 'react';

type InventoryItem = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  price: string;
  expiryDate: string;
};

const emptyItem = {
  name: '',
  quantity: '',
  unit: '',
  price: '',
  expiryDate: '',
};

const Inventory = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [inventoryFile, setInventoryFile] = useState<File | null>(null);

  const expiringSoon = useMemo(() => {
    const sevenDaysFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return items.filter((item) => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate).getTime();
      return expiry <= sevenDaysFromNow;
    }).length;
  }, [items]);

  const totalValue = useMemo(
    () =>
      items.reduce((sum, item) => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        return sum + quantity * price;
      }, 0),
    [items]
  );

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const addItem = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim() || !form.quantity.trim() || !form.unit.trim() || !form.price.trim() || !form.expiryDate) {
      return;
    }

    setItems((current) => [
      {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        quantity: form.quantity,
        unit: form.unit.trim(),
        price: form.price,
        expiryDate: form.expiryDate,
      },
      ...current,
    ]);
    setForm(emptyItem);
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInventoryFile(event.target.files?.[0] || null);
  };

  return (
    <div className="w-full max-w-6xl p-3 xs:p-4 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 overflow-x-hidden">
      <header className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Inventory</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">Ingredient inventory</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Track ingredients, quantities, prices, and expiry dates so Localyse AI can later recommend offers
            before stock expires.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-lavender-soft text-lavender px-3 py-1.5 text-xs font-medium">
          <i className="bi bi-stars text-[11px]" />
          Future AI input
        </div>
      </header>

      <section className="grid sm:grid-cols-3 gap-3 sm:gap-4">
        <SummaryCard icon="bi-box-seam" label="Items tracked" value={items.length.toString()} />
        <SummaryCard icon="bi-clock-history" label="Expiring soon" value={expiringSoon.toString()} />
        <SummaryCard icon="bi-cash-stack" label="Inventory value" value={`Rs ${totalValue.toLocaleString()}`} />
      </section>

      <section className="bg-card border border-border rounded-3xl p-4 sm:p-6 shadow-xs">
        <div className="grid lg:grid-cols-[1fr_280px] gap-5 items-center">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-2xl border-2 border-dashed border-border bg-secondary/30 hover:bg-primary-soft/40 hover:border-primary/40 transition p-6 sm:p-8 text-left flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <i className="bi bi-file-earmark-arrow-up text-2xl" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold tracking-tight">
                <span className="break-all">{inventoryFile ? inventoryFile.name : 'Upload inventory document or sheet'}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Select a CSV, Excel, or PDF inventory file for future AI inventory analysis.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['CSV', 'XLSX', 'PDF'].map((format) => (
                  <span key={format} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-card border border-border">
                    {format}
                  </span>
                ))}
              </div>
            </div>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.pdf"
            onChange={onFileChange}
            className="hidden"
          />

          <div className="bg-background border border-border rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Selected file</p>
            {inventoryFile ? (
              <div className="mt-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-lavender-soft text-lavender flex items-center justify-center shrink-0">
                  <i className="bi bi-file-earmark-spreadsheet text-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{inventoryFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{(inventoryFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => setInventoryFile(null)}
                  className="text-xs font-medium text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-3">No inventory file selected yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-[390px_1fr] gap-5 sm:gap-6">
        <form onSubmit={addItem} className="bg-card border border-border rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Add ingredient</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Save stock details here before connecting persistent inventory storage.
            </p>
          </div>

          <Field label="Ingredient / item name" value={form.name} onChange={(value) => updateField('name', value)} placeholder="Enter item name" />
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <Field label="Quantity" value={form.quantity} onChange={(value) => updateField('quantity', value)} type="number" placeholder="0" />
            <Field label="Unit" value={form.unit} onChange={(value) => updateField('unit', value)} placeholder="kg, packs, litres" />
          </div>
          <Field label="Price per unit" value={form.price} onChange={(value) => updateField('price', value)} type="number" placeholder="Rs" />
          <Field label="Expiry date" value={form.expiryDate} onChange={(value) => updateField('expiryDate', value)} type="date" placeholder="" />

          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground rounded-xl h-11 text-sm font-medium hover:bg-[hsl(var(--primary-hover))] transition active:scale-[0.99] inline-flex items-center justify-center gap-2"
          >
            <i className="bi bi-plus-lg" /> Add to inventory
          </button>
        </form>

        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xs">
          <div className="p-4 sm:p-6 border-b border-border flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Current stock</h2>
              <p className="text-xs text-muted-foreground mt-1">Items added in this session</p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{items.length} items</span>
          </div>

          {items.length === 0 ? (
            <div className="p-6 xs:p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-secondary text-muted-foreground flex items-center justify-center mx-auto mb-3">
                <i className="bi bi-basket text-xl" />
              </div>
              <p className="text-sm font-medium">No inventory items yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add ingredients with expiry dates to start building AI-ready stock context.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col xs:flex-row xs:flex-wrap xs:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                    <i className="bi bi-box2-heart text-base" />
                  </div>
                  <div className="w-full min-w-0 xs:flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.quantity} {item.unit} · Rs {Number(item.price).toLocaleString()} per unit
                    </p>
                  </div>
                  <div className="text-left xs:text-right shrink-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expires</p>
                    <p className="text-xs font-medium tabular-nums">{item.expiryDate}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-destructive transition"
                    aria-label={`Remove ${item.name}`}
                  >
                    <i className="bi bi-trash" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const SummaryCard = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs">
    <i className={`bi ${icon} text-muted-foreground text-base`} />
    <p className="text-xl sm:text-2xl font-semibold tracking-tight tabular-nums mt-3">{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) => (
  <label className="block">
    <span className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full bg-card text-foreground rounded-xl px-3 h-11 text-sm border border-border focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none transition placeholder:text-muted-foreground"
    />
  </label>
);

export default Inventory;
