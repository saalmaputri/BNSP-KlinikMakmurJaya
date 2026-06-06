export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-3xl font-extrabold text-primary md:text-4xl">{title}</h2>
        <p className="mt-2 text-muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
